"""规则引擎 — 预定义的硬条件检测

与真实场景的差距：
- 真实系统的规则引擎（如 Actimize、Fircosoft）支持：
  - 每个规则有独立的阈值、时间窗口、计分权重
  - 规则按资产类型/链/客户风险等级动态调整阈值
  - 规则之间可以编排（AND/OR/NOT 逻辑）
  - 实时的风控策略热更新（不停机修改规则）
- 真实规则的典型例子：
  - "单个地址24小时内跨链桥转入 > 50 ETH 且目标为混币器 → 自动冻结"
  - "30天内首次交互的新地址接收 > 10000 USDT → KYC 升级"
  - "资金在 < 5 个中间地址内到达制裁地址 → 触发 SAR 报告"
"""
import os
import time
from typing import Dict, List, Any
from config import KNOWN_MIXERS, SANCTIONED_ADDRESSES


# 所有阈值优先读取环境变量，生产环境由风控平台动态下发
LARGE_VALUE_THRESHOLD = float(os.getenv("RULE_LARGE_VALUE_ETH", "1000"))
HIGH_FREQ_TX_THRESHOLD = int(os.getenv("RULE_HIGH_FREQ_TX_COUNT", "50"))
HIGH_FREQ_WINDOW_DAYS = int(os.getenv("RULE_HIGH_FREQ_WINDOW_DAYS", "1"))
SANCTION_INTERACTION = os.getenv("RULE_SANCTION_CHECK", "true").lower() == "true"


class RuleEngine:
    def __init__(self):
        # 真实系统中规则定义从云端策略服务加载，
        # 每分钟热更新，支持 A/B 测试分组
        self.rules = [
            {
                "name": "mixer_interaction",
                "risk": "high",
                "action": "freeze",
            },
            {
                "name": "large_value_transfer",
                "risk": "medium",
                "action": "trigger_agent_review",
            },
            {
                "name": "high_frequency_trading",
                "risk": "low",
                "action": "tag_for_monitoring",
            },
            {
                "name": "sanctioned_address_interaction",
                "risk": "critical",
                "action": "freeze_and_report",
            },
        ]

    def evaluate(self, txs: List[Dict], counterparties: List[str], stats: Dict[str, float]) -> List[Dict[str, str]]:
        triggered = []

        # —— 1. 混币器交互检测 ——
        # 真实系统除了精确地址匹配，还会做：
        # - 模糊匹配（相似地址 detect）
        # - 行为模式匹配（通过混币器典型交互模式推断）
        # - 递归追溯（混币器上下游地址同样标记）
        for tx in txs:
            to_addr = tx.get("to", "").lower()
            if to_addr in {k.lower() for k in KNOWN_MIXERS}:
                triggered.append({
                    "rule": "mixer_interaction",
                    "risk": "high",
                    "detail": f"Direct interaction with known mixer: {tx.get('to', '')[:14]}...",
                    "tx": tx.get("hash", ""),
                })
                break

        # —— 2. 大额交易检测 ——
        # 真实系统做法：
        # - 阈值按资产类型动态调整（ETH 10K vs USDC 100K）
        # - 结合地址历史行为做异常检测（z-score 超过 3 标记）
        # - 大额交易触发 Counterparty Due Diligence 流程
        for tx in txs:
            val = tx.get("value_eth") or tx.get("value", 0)
            try:
                val = float(val)
            except (TypeError, ValueError):
                continue
            if val > LARGE_VALUE_THRESHOLD:
                triggered.append({
                    "rule": "large_value_transfer",
                    "risk": "medium",
                    "detail": f"Large transfer: {val:.4f} (threshold: {LARGE_VALUE_THRESHOLD})",
                    "tx": tx.get("hash", ""),
                })

        # —— 3. 高频交易检测 ——
        # 真实系统做法：
        # - 使用滑动时间窗口（如 24h/7d/30d），非简单计数
        # - 区分同一对手方反复交易 vs 大量新对手方
        # - 结合时间模式（深夜交易、毫秒级连续交易）
        if stats.get("tx_count", 0) > HIGH_FREQ_TX_THRESHOLD:
            detail = f"High tx count: {stats['tx_count']} in ~{HIGH_FREQ_WINDOW_DAYS}d window"
            triggered.append({
                "rule": "high_frequency_trading",
                "risk": "low",
                "detail": detail,
            })

        # —— 4. 制裁名单检测 ——
        # 真实系统做法：
        # - 使用 OFAC SDN / EU / UN / 各国监管名单
        # - 同名匹配（John Smith 等常见名字做模糊匹配）
        # - 实时弹窗（交易在 mempool 中即触发冻结）
        if SANCTION_INTERACTION:
            all_addrs = {tx.get("to", "").lower() for tx in txs} | {tx.get("from", "").lower() for tx in txs}
            sanctioned_addrs = {k.lower() for k in SANCTIONED_ADDRESSES}
            hit = all_addrs & sanctioned_addrs
            for addr in hit:
                triggered.append({
                    "rule": "sanctioned_address_interaction",
                    "risk": "critical",
                    "detail": f"Interaction with sanctioned address: {addr[:14]}...",
                    "tx": "",
                })

        return triggered
