"""AI 合规 Agent 主控制器 — 编排数据获取、分析、报告生成全流程"""
import os
import json
from typing import Dict, List
from web3 import Web3
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

from fetcher.evm import EVMFetcher
from fetcher.solana import SolanaFetcher
from analyzer.fund_flow import FundFlowTracer
from analyzer.profiler import AddressProfiler
from analyzer.risk import compute_multi_dimension_risk
from report.structured import generate_structured_report
from prompts import STRUCTURED_ANALYSIS_PROMPT
from rules import RuleEngine


class ComplianceAgent:
    def __init__(
        self,
        rpc_url: str = "http://127.0.0.1:8545",
        solana_rpc_url: str = "http://127.0.0.1:8899",
    ):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.evm_fetcher = EVMFetcher(self.w3)
        self.solana_fetcher = SolanaFetcher(solana_rpc_url)
        self.flow_tracer = FundFlowTracer(self.evm_fetcher, max_depth=2)
        self.profiler = AddressProfiler()
        self.rule_engine = RuleEngine()

        self.llm = None
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if api_key and api_key != "":
            self.llm = ChatOpenAI(
                model="deepseek-chat",
                temperature=0.0,
                api_key=api_key,
                base_url="https://api.deepseek.com",
            )

    # ── EVM 分析 ──

    async def analyze(self, address: str, contract_address: str) -> dict:
        audit: List[Dict] = []

        # 1. 获取交易数据
        txs = self.evm_fetcher.get_transfers(address, contract_address)
        if not txs:
            audit.append({"stage": "fetcher", "status": "no_data", "detail": "No transfers found"})
            return self._build_empty_response(address, audit)

        # 2. 资金流向追踪
        flow = self.flow_tracer.trace(address, contract_address)
        all_addresses = list(set(
            [n["address"] for n in flow["nodes"]]
            + [e["from"] for e in flow["edges"]]
            + [e["to"] for e in flow["edges"]]
        ))
        labels = self.profiler.profile_addresses(all_addresses)
        audit.append({"stage": "fund_flow", "status": "ok", "detail": f"Traced {len(flow['nodes'])} nodes at depth {flow['max_depth']}"})

        # 3. 规则引擎
        counterparties = list(set(e["to"] for e in flow["edges"]) | set(e["from"] for e in flow["edges"]))
        stats = {
            "tx_count": len(txs),
            "counterparties": len(counterparties),
            "total_sent": flow["total_sent"],
            "total_received": flow["total_received"],
        }
        triggers = self.rule_engine.evaluate(txs, counterparties, stats)
        audit.append({"stage": "rule_engine", "status": "ok", "detail": f"Triggered: {len(triggers)} rules"})

        # 4. 多维风险评分
        risk_dims = compute_multi_dimension_risk(flow, labels, stats)

        # 5. LLM 分析
        llm_result = await self._run_llm_analysis(
            address=address,
            txs=txs,
            flow=flow,
            labels=labels,
            stats=stats,
            triggers=triggers,
            risk_dims=risk_dims,
            currency="ETH",
        )

        # 6. 生成结构化报告
        audit.append({"stage": "llm_analysis", "status": "ok", "detail": "LLM analysis completed"})
        report = generate_structured_report(address, "ethereum", llm_result, flow, labels, audit)

        return report

    # ── Solana 分析 ──

    async def analyze_solana(self, address: str) -> dict:
        audit: List[Dict] = []

        cp_list = self.solana_fetcher.get_counterparties(address)
        if not cp_list:
            audit.append({"stage": "fetcher", "status": "no_data", "detail": "No activity found"})
            return self._build_empty_response(address, audit)

        labels = {}
        flow_lines = "\n".join(
            f"  {c['address'][:14]}...: {c['interactions']} interactions"
            for c in cp_list
        )

        stats = {"tx_count": sum(c["interactions"] for c in cp_list), "counterparties": len(cp_list)}
        audit.append({"stage": "fetcher", "status": "ok", "detail": f"Found {len(cp_list)} counterparties"})

        llm_result = await self._run_llm_analysis(
            address=address,
            txs=[],
            flow={"nodes": [], "edges": [], "max_depth": 1},
            labels=labels,
            stats=stats,
            triggers=[],
            risk_dims={},
            currency="SOL",
            use_llm_only=True,
            solana_cp_list=cp_list,
            solana_flow=flow_lines,
        )

        audit.append({"stage": "llm_analysis", "status": "ok", "detail": "LLM analysis completed"})
        report = generate_structured_report(address, "solana", llm_result, {"nodes": [], "edges": []}, labels, audit)
        return report

    # ── LLM 调用 ──

    async def _run_llm_analysis(
        self,
        address: str,
        txs: List[Dict],
        flow: dict,
        labels: dict,
        stats: dict,
        triggers: List[Dict],
        risk_dims: dict,
        currency: str,
        use_llm_only: bool = False,
        solana_cp_list: List[Dict] = None,
        solana_flow: str = "",
    ) -> dict:
        if use_llm_only and self.llm:
            # Solana: 只用 LLM
            result = await self._call_llm({
                "address": address,
                "tx_count": stats.get("tx_count", 0),
                "counterparties": stats.get("counterparties", 0),
                "total_received": "N/A",
                "total_sent": "N/A",
                "max_tx_value": "N/A",
                "flow_graph": "Solana flow data:\n" + solana_flow,
                "labels": "No known labels",
                "sample_txs": "",
                "rule_triggers": "None",
                "currency": "SOL",
                "trace_depth": 1,
            })
            return self._parse_llm_result(result, risk_dims)

        if self.llm:
            # 格式化数据
            flow_graph = self.flow_tracer.format_flow_for_llm(flow)
            label_text = self.profiler.format_labels_for_llm(labels)
            sample_txs = "\n".join(
                f"  {tx['hash'][:10]}...: {tx['from'][:8]}..->{tx['to'][:8]}.. = {tx['value_eth']:.4f}"
                for tx in sorted(txs, key=lambda x: x["block"], reverse=True)[:10]
            )
            trigger_text = "\n".join(f"  - {t['rule']}: {t['detail']}" for t in triggers) if triggers else "None"

            result = await self._call_llm({
                "address": address,
                "tx_count": stats["tx_count"],
                "counterparties": stats["counterparties"],
                "total_received": stats.get("total_received", 0),
                "total_sent": stats.get("total_sent", 0),
                "max_tx_value": max((tx["value_eth"] for tx in txs), default=0),
                "flow_graph": flow_graph,
                "labels": label_text,
                "sample_txs": sample_txs,
                "rule_triggers": trigger_text,
                "currency": currency,
                "trace_depth": flow.get("max_depth", 1),
            })
            return self._parse_llm_result(result, risk_dims)

        # 无 LLM 回退
        return self._fallback_llm_result(address, stats, risk_dims, currency)

    async def _call_llm(self, variables: dict) -> str:
        chain = STRUCTURED_ANALYSIS_PROMPT | self.llm | StrOutputParser()
        return await chain.ainvoke(variables)

    def _parse_llm_result(self, raw: str, risk_dims: dict) -> dict:
        try:
            parsed = json.loads(raw)
            if risk_dims and not parsed.get("risk_dimensions"):
                parsed["risk_dimensions"] = risk_dims
            return parsed
        except (json.JSONDecodeError, ValueError):
            return {
                "risk_score": 30,
                "risk_level": "medium",
                "risk_dimensions": risk_dims or {},
                "structured_report": {},
                "unusual_tx": [],
                "summary": "LLM analysis failed — using fallback assessment",
                "recommended_action": "review",
            }

    def _fallback_llm_result(self, address: str, stats: dict, risk_dims: dict, currency: str) -> dict:
        risk = min(100, max(5, stats.get("tx_count", 0) * 5 + stats.get("counterparties", 0) * 3))
        return {
            "risk_score": risk,
            "risk_level": "high" if risk >= 70 else ("medium" if risk >= 40 else "low"),
            "risk_dimensions": risk_dims or {},
            "structured_report": {
                "overview": f"Address {address[:10]}... with {stats.get('tx_count', 0)} transactions",
                "fund_flow_analysis": f"Volume: {stats.get('total_sent', 0) + stats.get('total_received', 0)} {currency}",
                "risk_assessment": f"Automated risk: {risk}/100",
                "recommendations": "Use LLM API key for detailed AI analysis",
            },
            "unusual_tx": [],
            "summary": f"Address {address[:10]}... has {stats.get('tx_count', 0)} transactions. Risk: {risk}/100.",
            "recommended_action": "monitor",
        }

    def _build_empty_response(self, address: str, audit: List[Dict]) -> dict:
        audit.append({"stage": "report", "status": "ok", "detail": "Generated empty response"})
        return {
            "risk_score": 10,
            "risk_level": "low",
            "behavior_profile": "No transaction history",
            "risk_dimensions": {},
            "fund_flow": {"total_sent": 0, "total_received": 0, "max_depth": 0, "nodes": [], "edges": []},
            "structured_report": {
                "overview": f"Address {address[:10]}... has no token transactions",
                "fund_flow_analysis": "No fund flows to analyze",
                "risk_assessment": "Minimal risk — zero on-chain activity",
                "recommendations": "No action needed",
            },
            "unusual_tx": [],
            "summary": f"Address {address[:10]}... has no token transactions. Minimal risk due to zero activity.",
            "recommended_action": "pass",
            "recommendation": {"action": "pass", "notes": "No activity"},
            "audit_trail": audit,
        }
