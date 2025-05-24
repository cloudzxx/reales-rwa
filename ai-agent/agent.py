import os
import json
from web3 import Web3
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

TRANSFER_EVENT_SIGNATURE = Web3.keccak(
    text="Transfer(address,address,uint256)"
)

ANALYSIS_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a blockchain compliance analyst. Analyze the given address's on-chain behavior and produce a risk assessment.

Respond ONLY with a JSON object in this exact format (no markdown, no backticks):
{{
  "risk_score": <integer 0-100>,
  "behavior_profile": "<brief description of behavior pattern>",
  "unusual_tx": [<array of transaction hashes that look suspicious>],
  "summary": "<detailed analysis summary in 2-3 sentences>"
}}

Risk factors to consider:
- High transaction frequency
- Very large transaction amounts
- Interactions with many unique counterparties
- Round-number transfers (potential layering)
- Fresh address with sudden large activity

Be conservative: if data is limited, default to low-medium risk (20-40)."""),
    ("user", """Analyze this address: {address}

Transaction statistics:
- Total transactions: {tx_count}
- Unique counterparties: {counterparties}
- Total volume (ETH): {total_volume}
- Max single transaction (ETH): {max_tx_value}
- First block seen: {first_block}
- Last block seen: {last_block}

Sample transactions (up to 10):
{sample_txs}"""),
])


class ComplianceAgent:
    def __init__(self, rpc_url: str = "http://127.0.0.1:8545"):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.llm = None
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and api_key != "":
            self.llm = ChatOpenAI(model="gpt-4o-mini", api_key=api_key)

    async def analyze(self, address: str, contract_address: str) -> dict:
        address = self.w3.to_checksum_address(address)
        contract_address = self.w3.to_checksum_address(contract_address)

        topic = self.w3.keccak(text="Transfer(address,address,uint256)")
        from_topic_padded = "0x" + address[2:].lower().rjust(64, "0")
        to_topic_padded = "0x" + address[2:].lower().rjust(64, "0")

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

        all_logs = from_logs + to_logs

        if not all_logs:
            return self._build_empty_response(address)

        counterparties = set()
        total_volume = 0
        max_tx_value = 0
        txs = []

        for log in all_logs:
            from_addr = "0x" + log["topics"][1].hex()[-40:]
            to_addr = "0x" + log["topics"][2].hex()[-40:]
            value = int(log["data"].hex(), 16) if log["data"] != "0x" else 0

            if from_addr.lower() == address.lower():
                counterparties.add(to_addr)
            else:
                counterparties.add(from_addr)

            total_volume += value
            if value > max_tx_value:
                max_tx_value = value

            txs.append({
                "hash": log["transactionHash"].hex(),
                "from": from_addr,
                "to": to_addr,
                "value": self.w3.from_wei(value, "ether"),
                "blockNumber": log["blockNumber"],
            })

        first_block = min(log["blockNumber"] for log in all_logs)
        last_block = max(log["blockNumber"] for log in all_logs)

        stats = {
            "tx_count": len(all_logs),
            "counterparties": len(counterparties),
            "total_volume": round(self.w3.from_wei(total_volume, "ether"), 4),
            "max_tx_value": round(self.w3.from_wei(max_tx_value, "ether"), 4),
            "first_block": first_block,
            "last_block": last_block,
        }

        sample_txs = "\n".join(
            f"  {tx['hash']}: {tx['from'][:10]}... -> {tx['to'][:10]}... = {tx['value']} ETH"
            for tx in txs[:10]
        )

        if self.llm:
            chain = ANALYSIS_PROMPT | self.llm | StrOutputParser()
            result = await chain.ainvoke({
                "address": address,
                **stats,
                "sample_txs": sample_txs,
            })
            try:
                parsed = json.loads(result)
                return {
                    "risk_score": int(parsed.get("risk_score", 30)),
                    "behavior_profile": parsed.get("behavior_profile", "Unknown"),
                    "unusual_tx": parsed.get("unusual_tx", []),
                    "summary": parsed.get("summary", "No summary available."),
                }
            except (json.JSONDecodeError, ValueError):
                return self._fallback_analysis(address, stats, txs)
        else:
            return self._fallback_analysis(address, stats, txs)

    def _fallback_analysis(self, address: str, stats: dict, txs: list) -> dict:
        risk = min(100, max(5, stats["tx_count"] * 5 + stats["counterparties"] * 3))
        unusual = []
        for tx in txs:
            if float(tx["value"]) > 100:
                unusual.append(tx["hash"])

        return {
            "risk_score": risk,
            "behavior_profile": (
                "Active trader"
                if stats["tx_count"] > 10
                else "Low activity holder"
            ),
            "unusual_tx": unusual[:5],
            "summary": (
                f"Mock analysis: Address {address[:10]}... has {stats['tx_count']} "
                f"transactions across {stats['counterparties']} counterparties, "
                f"total volume {stats['total_volume']} ETH. "
                f"Risk rated at {risk}/100 based on activity level."
            ),
        }

    def _build_empty_response(self, address: str) -> dict:
        return {
            "risk_score": 10,
            "behavior_profile": "No transaction history",
            "unusual_tx": [],
            "summary": f"Address {address[:10]}... has no token transactions. "
                       f"Minimal risk due to zero activity.",
        }
