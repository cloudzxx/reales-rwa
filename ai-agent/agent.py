"""AI 合规 Agent 主控制器 — 编排数据获取、分析、报告生成全流程"""
import os
import json
import time
import asyncio
import logging
from typing import Dict, List
from web3 import Web3
from solana.rpc.api import Client as SolanaClient
from langchain_openai import ChatOpenAI

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("agent")

from fetcher.evm import EVMFetcher
from fetcher.solana import SolanaFetcher
from analyzer.fund_flow import FundFlowTracer, build_flow_graph
from analyzer.profiler import Profiler
from analyzer.risk import RiskAnalyzer
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
        self.solana_fetcher = SolanaFetcher(SolanaClient(solana_rpc_url))
        self.flow_tracer = FundFlowTracer(self.evm_fetcher, max_depth=2)
        self.profiler = Profiler()
        self.risk_analyzer = RiskAnalyzer()
        self.rule_engine = RuleEngine()

        self.llm = None
        api_key = os.getenv("MINIMAX_API_KEY")
        if api_key and api_key != "":
            self.llm = ChatOpenAI(
                model=os.getenv("LLM_MODEL", "MiniMax-M2.7"),
                temperature=0.0,
                api_key=api_key,
                base_url="https://api.minimax.chat/v1",
                timeout=60,
                max_retries=0,
            )

    # ── EVM 分析 ──

    async def analyze(self, address: str, contract_address: str, max_blocks: int = 0) -> dict:
        t_start = time.time()
        audit: List[Dict] = []
        logger.info(f"Analyze EVM addr={address[:14]}... contract={contract_address[:14]}...")

        # 1. 获取交易数据（外部 RPC 限制区块范围）
        t0 = time.time()
        txs = self.evm_fetcher.get_transfers(address, contract_address, max_blocks=max_blocks)
        logger.info(f"  fetch: {len(txs)} txs in {time.time()-t0:.2f}s")
        if not txs:
            audit.append({"stage": "fetcher", "status": "no_data", "detail": "No transfers found"})
            logger.info(f"  done: no transfers (total {time.time()-t_start:.1f}s)")
            return self._build_empty_response(address, audit)

        # 2. 资金流向追踪
        t0 = time.time()
        traced_txs = self.flow_tracer.trace(address, contract_address)
        all_txs = txs + traced_txs
        flow = build_flow_graph(all_txs)
        all_addresses = list(set(
            [n["id"] for n in flow["nodes"]]
            + [e["from"] for e in flow["edges"]]
            + [e["to"] for e in flow["edges"]]
        ))
        labels = self.profiler.profile(all_addresses)
        logger.info(f"  flow: {len(flow['nodes'])} nodes depth={self.flow_tracer.max_depth} in {time.time()-t0:.2f}s")
        audit.append({"stage": "fund_flow", "status": "ok", "detail": f"Traced {len(flow['nodes'])} nodes at depth {self.flow_tracer.max_depth}"})

        # 3. 规则引擎
        t0 = time.time()
        counterparties = list(set(e["to"] for e in flow["edges"]) | set(e["from"] for e in flow["edges"]))
        stats = {
            "tx_count": len(txs),
            "counterparties": len(counterparties),
            "total_sent": flow["total_sent"],
            "total_received": flow["total_received"],
        }
        triggers = self.rule_engine.evaluate(txs, counterparties, stats)
        logger.info(f"  rules: {len(triggers)} triggers in {time.time()-t0:.3f}s")
        audit.append({"stage": "rule_engine", "status": "ok", "detail": f"Triggered: {len(triggers)} rules"})

        # 4. 多维风险评分
        t0 = time.time()
        risk_dims = self.risk_analyzer.evaluate(profiles=labels, fund_flow=flow, stats=stats)
        logger.info(f"  risk_dims: {len(risk_dims['dimensions'])} dimensions in {time.time()-t0:.3f}s")

        # 5. LLM 分析
        t0 = time.time()
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
        llm_elapsed = time.time() - t0
        audit.append({"stage": "llm_analysis", "status": "ok", "detail": f"LLM in {llm_elapsed:.1f}s"})

        # 6. 生成结构化报告
        report = generate_structured_report(address, "ethereum", llm_result, flow, labels, audit)
        total = time.time() - t_start
        logger.info(f"  done: total={total:.1f}s score={llm_result.get('risk_score','?')}")
        return report

    # ── Solana 分析 ──

    async def analyze_solana(self, address: str) -> dict:
        t_start = time.time()
        audit: List[Dict] = []
        logger.info(f"Analyze Solana addr={address[:14]}...")

        # 1. 获取 SPL Token 转账
        t0 = time.time()
        txs = self.solana_fetcher.get_spl_transfers(address)
        logger.info(f"  fetch: {len(txs)} token transfers in {time.time()-t0:.2f}s")
        if not txs:
            audit.append({"stage": "fetcher", "status": "no_data", "detail": "No SPL Token transfers found"})
            logger.info(f"  done: no activity (total {time.time()-t_start:.1f}s)")
            return self._build_empty_response(address, audit)

        # 2. 资金流向追踪
        t0 = time.time()
        flow = build_flow_graph(txs)
        all_addresses = list(set(
            [n["id"] for n in flow["nodes"]]
            + [e["from"] for e in flow["edges"]]
            + [e["to"] for e in flow["edges"]]
        ))
        labels = self.profiler.profile(all_addresses)
        logger.info(f"  flow: {len(flow['nodes'])} nodes in {time.time()-t0:.2f}s")
        audit.append({"stage": "fund_flow", "status": "ok", "detail": f"Traced {len(flow['nodes'])} nodes"})

        # 3. 规则引擎
        t0 = time.time()
        counterparties = list(set(e["to"] for e in flow["edges"]) | set(e["from"] for e in flow["edges"]))
        stats = {
            "tx_count": len(txs),
            "counterparties": len(counterparties),
            "total_sent": flow["total_sent"],
            "total_received": flow["total_received"],
        }
        triggers = self.rule_engine.evaluate(txs, counterparties, stats)
        logger.info(f"  rules: {len(triggers)} triggers in {time.time()-t0:.3f}s")
        audit.append({"stage": "rule_engine", "status": "ok", "detail": f"Triggered: {len(triggers)} rules"})

        # 4. 多维风险评分
        t0 = time.time()
        risk_dims = self.risk_analyzer.evaluate(profiles=labels, fund_flow=flow, stats=stats)
        logger.info(f"  risk_dims: {len(risk_dims['dimensions'])} dimensions in {time.time()-t0:.3f}s")

        # 5. LLM 分析
        t0 = time.time()
        llm_result = await self._run_llm_analysis(
            address=address,
            txs=txs,
            flow=flow,
            labels=labels,
            stats=stats,
            triggers=triggers,
            risk_dims=risk_dims,
            currency="SOL",
        )
        llm_elapsed = time.time() - t0
        audit.append({"stage": "llm_analysis", "status": "ok", "detail": f"LLM in {llm_elapsed:.1f}s"})

        # 6. 生成结构化报告
        report = generate_structured_report(address, "solana", llm_result, flow, labels, audit)
        total = time.time() - t_start
        logger.info(f"  done: total={total:.1f}s score={llm_result.get('risk_score','?')}")
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
    ) -> dict:
        try:
            if self.llm:
                flow_graph = self._format_flow_for_llm(flow)
                label_text = self._format_labels_for_llm(labels)
                value_key = "value_eth" if currency == "ETH" else "value"
                sample_txs = "\n".join(
                    f"  {tx['hash'][:10]}...: {tx['from'][:8]}..->{tx['to'][:8]}.. = {tx.get(value_key, tx.get('value', 0)):.4f}"
                    for tx in sorted(txs, key=lambda x: x.get("block") or x.get("slot", 0), reverse=True)[:10]
                )
                trigger_text = "\n".join(f"  - {t['rule']}: {t['detail']}" for t in triggers) if triggers else "None"

                result, meta = await self._call_llm({
                    "address": address,
                    "tx_count": stats["tx_count"],
                    "counterparties": stats["counterparties"],
                    "total_received": stats.get("total_received", 0),
                    "total_sent": stats.get("total_sent", 0),
                    "max_tx_value": max((tx.get(value_key, tx.get("value", 0)) for tx in txs), default=0),
                    "flow_graph": flow_graph,
                    "labels": label_text,
                    "sample_txs": sample_txs,
                    "rule_triggers": trigger_text,
                    "currency": currency,
                    "trace_depth": flow.get("max_depth", 1),
                })
                parsed = self._parse_llm_result(result, risk_dims)
                logger.info(f"LLM OK [{currency}] {meta}")
                return parsed
        except Exception as e:
            logger.warning(f"LLM error, fallback to rule engine: {e}")

        logger.info("LLM unavailable, using rule engine fallback")
        return self._fallback_llm_result(address, stats, risk_dims, currency)

    def _format_flow_for_llm(self, flow: dict) -> str:
        lines = []
        lines.append(f"Total Sent: {flow['total_sent']:.4f} | Total Received: {flow['total_received']:.4f}")
        lines.append(f"Nodes: {len(flow['nodes'])} | Edges: {len(flow['edges'])}")
        lines.append("")
        for node in flow["nodes"][:15]:
            lines.append(f"  {node['id'][:14]}... sent={node['total_sent']:.4f} recv={node['total_received']:.4f}")
        if len(flow["edges"]) <= 20:
            lines.append("")
            for edge in flow["edges"]:
                lines.append(f"  {edge['from'][:10]}.. -> {edge['to'][:10]}.. = {edge['value_eth']:.4f}")
        return "\n".join(lines)

    def _format_labels_for_llm(self, labels: dict) -> str:
        type_summary = {"exchange": 0, "mixer": 0, "bridge": 0, "sanctioned": 0, "unknown": 0}
        lines = []
        for addr, info in labels.items():
            t = info.get("type", "unknown")
            type_summary[t] = type_summary.get(t, 0) + 1
            if t != "unknown" and info.get("label"):
                lines.append(f"  {addr[:14]}... → {t.upper()}: {info['label']}")
        lines.insert(0, f"Label Summary: {type_summary}")
        return "\n".join(lines)

    async def _call_llm(self, variables: dict) -> tuple:
        messages = STRUCTURED_ANALYSIS_PROMPT.format_messages(**variables)
        t0 = time.time()
        response = await asyncio.wait_for(self.llm.ainvoke(messages), timeout=120)
        elapsed = time.time() - t0

        usage = {}
        meta = getattr(response, "response_metadata", {}) or {}
        if meta:
            usage = meta.get("token_usage") or meta.get("usage") or {}
        elif hasattr(response, "usage_metadata") and response.usage_metadata:
            usage = response.usage_metadata

        tokens = ""
        if usage:
            pt = usage.get("prompt_tokens") or usage.get("input_tokens") or 0
            ct = usage.get("completion_tokens") or usage.get("output_tokens") or 0
            tt = usage.get("total_tokens") or 0
            tokens = f"in={pt} out={ct} total={tt}"

        result = response.content if hasattr(response, "content") else str(response)
        logger.info(f"LLM call duration={elapsed:.1f}s {tokens}")
        return result, tokens or f"duration={elapsed:.1f}s"

    def _parse_llm_result(self, raw: str, risk_dims: dict) -> dict:
        try:
            import re
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            if json_match:
                raw = json_match.group()
            parsed = json.loads(raw)
            if risk_dims and not parsed.get("risk_dimensions"):
                parsed["risk_dimensions"] = risk_dims
            if not parsed.get("structured_report"):
                parsed["structured_report"] = {
                    "overview": parsed.get("summary", "Analysis completed"),
                    "risk_assessment": f"Score: {parsed.get('risk_score', 30)}/100",
                    "recommendations": parsed.get("recommended_action", "monitor"),
                }
            return parsed
        except (json.JSONDecodeError, ValueError):
            risk = min(100, max(5, 0))
            return {
                "risk_score": 30,
                "risk_level": "medium",
                "risk_dimensions": risk_dims or {},
                "structured_report": {
                    "overview": "LLM analysis failed — using rule engine assessment",
                    "fund_flow_analysis": "See fund flow section for details",
                    "risk_assessment": f"Automated risk: {risk}/100",
                    "recommendations": "Review API key or try again later",
                },
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
