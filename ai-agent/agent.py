import os
import json
import requests
from typing import Dict, List, Any
from web3 import Web3
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

TRANSFER_EVENT_SIGNATURE = Web3.keccak(
    text="Transfer(address,address,uint256)"
)

ANALYSIS_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a senior blockchain compliance analyst. Analyze the address and produce a structured risk report.

Respond ONLY with a JSON object in this exact format (no markdown, no backticks):
{{
  "risk_score": <integer 0-100>,
  "risk_level": "<low|medium|high|critical>",
  "behavior_profile": "<one-line summary of behavior>",
  "fund_flow": {{
    "total_received": "<string with unit>",
    "total_sent": "<string with unit>",
    "net_position": "<net in/out description>",
    "top_counterparties": [<list of top 5 counterparties with amounts>],
    "flow_summary": "<1-2 sentence flow analysis>"
  }},
  "structured_report": {{
    "overview": "<2-3 sentences: who is this address, what does it do>",
    "fund_flow_analysis": "<2-3 sentences: where funds come from and go, patterns>",
    "risk_assessment": "<2-3 sentences: specific risks identified, confidence level>",
    "recommendations": "<2-3 sentences: what actions to take>"
  }},
  "unusual_tx": [<array of suspicious transaction hashes>],
  "summary": "<overall summary in 1-2 sentences>"
}}

Risk factors:
- Funds sourced from or sent to unverified/unknown addresses
- Large-volume rapid transfers (layering suspicion)
- Circular flows or self-transfers
- Round-number amounts (potential structuring)
- Fresh addresses receiving large amounts
- Disproportionate flow direction (one-way in or out)

Be specific about flow patterns. If data is limited, mark risk_level as "low" with brief analysis."""),
    ("user", """Analyze: {address}

Transaction stats:
- Total transactions: {tx_count}
- Unique counterparties: {counterparties}
- Total received: {total_received} {currency}
- Total sent: {total_sent} {currency}
- Max single tx: {max_tx_value} {currency}

Recent transactions (newest first):
{sample_txs}

Fund flow by counterparty:
{flow_data}"""),
])


class ComplianceAgent:
    def __init__(self, rpc_url: str = "http://127.0.0.1:8545", solana_rpc_url: str = "http://127.0.0.1:8899"):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.solana_rpc_url = solana_rpc_url
        self.llm = None
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if api_key and api_key != "":
            self.llm = ChatOpenAI(
                model="deepseek-chat",
                temperature=0.0,
                api_key=api_key,
                base_url="https://api.deepseek.com",
            )

    async def analyze(self, address: str, contract_address: str, currency: str = "ETH") -> dict:
        address = self.w3.to_checksum_address(address)
        contract_address = self.w3.to_checksum_address(contract_address)

        topic = TRANSFER_EVENT_SIGNATURE
        from_topic_padded = "0x" + address[2:].lower().rjust(64, "0")
        to_topic_padded = "0x" + address[2:].lower().rjust(64, "0")

        try:
            from_logs = self.w3.eth.get_logs({
                "address": contract_address,
                "fromBlock": 0,
                "toBlock": "latest",
                "topics": [topic, from_topic_padded],
            })
            to_logs = self.w3.eth.get_logs({
                "address": contract_address,
                "fromBlock": 0,
                "toBlock": "latest",
                "topics": [topic, None, to_topic_padded],
            })
        except Exception:
            return self._error_response("Failed to query blockchain")

        all_logs = from_logs + to_logs
        if not all_logs:
            return self._build_empty_response(address)

        counterparties: Dict[str, Dict[str, float]] = {}
        total_sent = 0
        total_received = 0
        max_tx_value = 0
        txs: List[Dict] = []

        for log in all_logs:
            from_addr = "0x" + log["topics"][1].hex()[-40:]
            to_addr = "0x" + log["topics"][2].hex()[-40:]
            value = int(log["data"].hex(), 16) if log["data"] != "0x" else 0
            value_eth = float(self.w3.from_wei(value, "ether"))

            if from_addr.lower() == address.lower():
                total_sent += value_eth
                if to_addr not in counterparties:
                    counterparties[to_addr] = {"sent": 0, "received": 0}
                counterparties[to_addr]["sent"] += value_eth
            else:
                total_received += value_eth
                if from_addr not in counterparties:
                    counterparties[from_addr] = {"sent": 0, "received": 0}
                counterparties[from_addr]["received"] += value_eth

            max_tx_value = max(max_tx_value, value_eth)
            txs.append({
                "hash": log["transactionHash"].hex(),
                "from": from_addr,
                "to": to_addr,
                "value": value_eth,
                "blockNumber": log["blockNumber"],
            })

        # 资金流向：追踪一级对手方
        fund_flow = self._trace_fund_flow(address, contract_address, counterparties)

        stats = {
            "tx_count": len(all_logs),
            "counterparties": len(counterparties),
            "total_sent": round(total_sent, 4),
            "total_received": round(total_received, 4),
            "max_tx_value": round(max_tx_value, 4),
        }

        txs_sorted = sorted(txs, key=lambda x: x["blockNumber"], reverse=True)
        sample_txs = "\n".join(
            f"  {tx['hash'][:10]}...: {tx['from'][:8]}..->{tx['to'][:8]}.. = {tx['value']:.4f} ETH"
            for tx in txs_sorted[:10]
        )

        # 构建对手方资金流向摘要
        flow_lines = []
        for addr, flows in sorted(counterparties.items(), key=lambda x: x[1]["sent"] + x[1]["received"], reverse=True)[:10]:
            flow_lines.append(
                f"  {addr[:14]}...: sent={flows['sent']:.4f}ETH received={flows['received']:.4f}ETH"
            )
        flow_data = "\n".join(flow_lines) if flow_lines else "No counterparty data"

        if self.llm:
            try:
                chain = ANALYSIS_PROMPT | self.llm | StrOutputParser()
                result = await chain.ainvoke({
                    "address": address,
                    **stats,
                    "sample_txs": sample_txs,
                    "flow_data": flow_data,
                    "currency": currency,
                })
                parsed = json.loads(result)
                return self._merge_llm_result(parsed, fund_flow, txs_sorted[:10])
            except (json.JSONDecodeError, ValueError):
                return self._fallback_analysis(address, stats, fund_flow, txs_sorted[:10], currency)
            except (json.JSONDecodeError, ValueError):
                return self._fallback_analysis(address, stats, fund_flow, txs_sorted[:10], currency)
        else:
            return self._fallback_analysis(address, stats, fund_flow, txs_sorted[:10], currency)

    def _trace_fund_flow(self, address: str, contract_address: str, counterparties: Dict[str, Dict[str, float]]) -> Dict:
        """追踪一级资金流向：获取每个对手方的交易统计"""
        topic = TRANSFER_EVENT_SIGNATURE
        flow = {"total_received": 0.0, "total_sent": 0.0, "counterparties": []}

        for cp_addr, amounts in counterparties.items():
            cp_data = {"address": cp_addr, "sent": amounts.get("sent", 0), "received": amounts.get("received", 0)}

            # 获取对手方的交易量（一级追溯）
            try:
                cp_from = self.w3.eth.get_logs({
                    "address": contract_address,
                    "fromBlock": 0,
                    "toBlock": "latest",
                    "topics": [topic, "0x" + cp_addr[2:].lower().rjust(64, "0")],
                })
                cp_to = self.w3.eth.get_logs({
                    "address": contract_address,
                    "fromBlock": 0,
                    "toBlock": "latest",
                    "topics": [topic, None, "0x" + cp_addr[2:].lower().rjust(64, "0")],
                })
                cp_data["counterparty_tx_count"] = len(cp_from) + len(cp_to)
            except Exception:
                cp_data["counterparty_tx_count"] = 0

            if cp_data["sent"] > 0:
                flow["total_sent"] += cp_data["sent"]
            if cp_data["received"] > 0:
                flow["total_received"] += cp_data["received"]

            flow["counterparties"].append(cp_data)

        flow["total_received"] = round(flow["total_received"], 4)
        flow["total_sent"] = round(flow["total_sent"], 4)
        flow["counterparties"].sort(
            key=lambda x: x["sent"] + x["received"], reverse=True
        )
        return flow

    def _merge_llm_result(self, parsed: dict, fund_flow: dict, txs: list) -> dict:
        return {
            "risk_score": int(parsed.get("risk_score", 30)),
            "risk_level": parsed.get("risk_level", "medium"),
            "behavior_profile": parsed.get("behavior_profile", "Unknown"),
            "fund_flow": {
                "total_sent": fund_flow["total_sent"],
                "total_received": fund_flow["total_received"],
                "top_counterparties": parsed.get("fund_flow", {}).get("top_counterparties", fund_flow["counterparties"][:5]),
                "flow_summary": parsed.get("fund_flow", {}).get("flow_summary", "No flow data available"),
                "raw_counterparties": fund_flow["counterparties"],
            },
            "structured_report": {
                "overview": parsed.get("structured_report", {}).get("overview", ""),
                "fund_flow_analysis": parsed.get("structured_report", {}).get("fund_flow_analysis", ""),
                "risk_assessment": parsed.get("structured_report", {}).get("risk_assessment", ""),
                "recommendations": parsed.get("structured_report", {}).get("recommendations", ""),
            },
            "unusual_tx": parsed.get("unusual_tx", []),
            "summary": parsed.get("summary", "No summary available."),
            "analyzed_transactions": txs,
        }

    def _solana_rpc_call(self, method: str, params: list) -> dict:
        resp = requests.post(
            self.solana_rpc_url,
            json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
            timeout=10,
        )
        return resp.json()

    async def analyze_solana(self, address: str) -> dict:
        try:
            sigs_resp = self._solana_rpc_call("getSignaturesForAddress", [
                address, {"limit": 30}
            ])
            sigs = sigs_resp.get("result", []) if "result" in sigs_resp else []
            if not sigs:
                return self._build_empty_response(address)

            tx_count = len(sigs)
            counterparties_dict: Dict[str, int] = {}

            for sig_info in sigs:
                tx_resp = self._solana_rpc_call("getTransaction", [
                    sig_info["signature"],
                    {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0},
                ])
                tx = tx_resp.get("result")
                if tx:
                    accounts = tx.get("transaction", {}).get("message", {}).get("accountKeys", [])
                    for acc in accounts:
                        addr_str = acc.get("pubkey", "")
                        if addr_str.lower() != address.lower():
                            counterparties_dict[addr_str] = counterparties_dict.get(addr_str, 0) + 1

            cp_list = [{"address": k, "interactions": v} for k, v in sorted(
                counterparties_dict.items(), key=lambda x: x[1], reverse=True
            )[:10]]

            flow_lines = "\n".join(
                f"  {c['address'][:14]}...: {c['interactions']} interactions"
                for c in cp_list
            )

            stats = {"tx_count": tx_count, "counterparties": len(cp_list)}

            if self.llm:
                chain = ANALYSIS_PROMPT | self.llm | StrOutputParser()
                result = await chain.ainvoke({
                    "address": address,
                    "tx_count": tx_count,
                    "counterparties": len(cp_list),
                    "total_received": "N/A",
                    "total_sent": "N/A",
                    "max_tx_value": "N/A",
                    "sample_txs": "\n".join(s["signature"] for s in sigs[:10]),
                    "flow_data": flow_lines,
                    "currency": "SOL",
                })
                try:
                    parsed = json.loads(result)
                    return {
                        "risk_score": int(parsed.get("risk_score", 30)),
                        "risk_level": parsed.get("risk_level", "medium"),
                        "behavior_profile": parsed.get("behavior_profile", "Unknown"),
                        "fund_flow": {
                            "top_counterparties": cp_list,
                            "flow_summary": parsed.get("fund_flow", {}).get("flow_summary", ""),
                        },
                        "structured_report": {
                            "overview": parsed.get("structured_report", {}).get("overview", ""),
                            "fund_flow_analysis": parsed.get("structured_report", {}).get("fund_flow_analysis", ""),
                            "risk_assessment": parsed.get("structured_report", {}).get("risk_assessment", ""),
                            "recommendations": parsed.get("structured_report", {}).get("recommendations", ""),
                        },
                        "unusual_tx": parsed.get("unusual_tx", []),
                        "summary": parsed.get("summary", ""),
                    }
                except (json.JSONDecodeError, ValueError):
                    pass

            return {
                "risk_score": min(100, tx_count * 3),
                "risk_level": "low" if tx_count < 10 else "medium",
                "behavior_profile": "Solana active user" if tx_count > 5 else "Solana low activity user",
                "fund_flow": {"top_counterparties": cp_list, "flow_summary": f"{len(cp_list)} counterparties found"},
                "structured_report": {
                    "overview": f"Solana address with {tx_count} recent transactions",
                    "fund_flow_analysis": f"Interacted with {len(cp_list)} unique counterparties",
                    "risk_assessment": "Low risk (limited data on Solana)",
                    "recommendations": "Monitor further activity",
                },
                "unusual_tx": [],
                "summary": f"Solana address {address[:10]}... has {tx_count} recent transactions across {len(cp_list)} counterparties.",
            }

        except Exception as e:
            return self._error_response(f"Solana query failed: {str(e)}")

    def _fallback_analysis(self, address: str, stats: dict, fund_flow: dict, txs: list, currency: str = "ETH") -> dict:
        risk = min(100, max(5, stats["tx_count"] * 5 + stats["counterparties"] * 3))
        unusual = [tx["hash"] for tx in txs if tx.get("value", 0) > 100][:5]

        return {
            "risk_score": risk,
            "risk_level": "high" if risk >= 70 else ("medium" if risk >= 40 else "low"),
            "behavior_profile": "Active trader" if stats["tx_count"] > 10 else "Low activity holder",
            "fund_flow": {
                "total_sent": stats.get("total_sent", 0),
                "total_received": stats.get("total_received", 0),
                "top_counterparties": fund_flow.get("counterparties", [])[:5],
                "flow_summary": f"{stats['counterparties']} counterparties, volume {stats.get('total_received', 0) + stats.get('total_sent', 0)} {currency}",
            },
            "structured_report": {
                "overview": f"Address with {stats['tx_count']} transactions",
                "fund_flow_analysis": f"Interacted with {stats['counterparties']} unique addresses. Total volume: {stats.get('total_received', 0) + stats.get('total_sent', 0)} {currency}",
                "risk_assessment": f"Automated risk score: {risk}/100 based on activity metrics",
                "recommendations": "Use LLM API key for detailed AI analysis",
            },
            "unusual_tx": unusual,
            "summary": f"Address {address[:10]}... has {stats['tx_count']} transactions across {stats['counterparties']} counterparties. Risk: {risk}/100.",
            "analyzed_transactions": txs,
        }

    def _build_empty_response(self, address: str) -> dict:
        return {
            "risk_score": 10,
            "risk_level": "low",
            "behavior_profile": "No transaction history",
            "fund_flow": {"total_sent": 0, "total_received": 0, "top_counterparties": [], "flow_summary": "No activity detected"},
            "structured_report": {
                "overview": f"Address {address[:10]}... has no token transactions on record",
                "fund_flow_analysis": "No fund flows to analyze",
                "risk_assessment": "Minimal risk due to zero on-chain activity",
                "recommendations": "No action needed at this time",
            },
            "unusual_tx": [],
            "summary": f"Address {address[:10]}... has no token transactions. Minimal risk due to zero activity.",
        }

    def _error_response(self, msg: str) -> dict:
        return {
            "risk_score": 50,
            "risk_level": "medium",
            "behavior_profile": "Analysis failed",
            "fund_flow": {"total_sent": 0, "total_received": 0, "top_counterparties": [], "flow_summary": "Query failed"},
            "structured_report": {
                "overview": msg,
                "fund_flow_analysis": "Data unavailable",
                "risk_assessment": "Unable to assess risk",
                "recommendations": "Retry analysis later",
            },
            "unusual_tx": [],
            "summary": msg,
        }
