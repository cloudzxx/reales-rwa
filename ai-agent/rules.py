"""规则引擎 — 轻量级硬条件过滤"""
from typing import Dict, List, Any
from config import KNOWN_MIXERS


class RuleEngine:
    def __init__(self):
        self.rules = [
            {
                "name": "mixer_interaction",
                "description": "与已知混币合约交互",
                "risk": "high",
                "action": "trigger_agent_review",
            },
            {
                "name": "large_value",
                "description": "单笔交易超过阈值",
                "threshold": 1000,
                "risk": "medium",
                "action": "trigger_agent_review",
            },
            {
                "name": "high_frequency",
                "description": "交易频率异常高",
                "threshold_tx_per_day": 50,
                "risk": "medium",
                "action": "trigger_agent_review",
            },
        ]

    def evaluate(self, txs: List[Dict], counterparties: List[str], stats: Dict[str, float]) -> List[Dict[str, str]]:
        """评估是否触发规则"""
        triggered = []

        # 检查混币器交互
        for tx in txs:
            if tx.get("to", "").lower() in {k.lower() for k in KNOWN_MIXERS}:
                triggered.append({
                    "rule": "mixer_interaction",
                    "risk": "high",
                    "detail": f"Interaction with mixer: {tx['to'][:14]}...",
                    "tx": tx.get("hash", ""),
                })
                break

        # 检查大额交易
        for tx in txs:
            if tx.get("value_eth", 0) > 1000:
                triggered.append({
                    "rule": "large_value",
                    "risk": "medium",
                    "detail": f"Large transfer: {tx['value_eth']:.4f}",
                    "tx": tx.get("hash", ""),
                })

        # 检查高频率
        if stats.get("tx_count", 0) > 50:
            triggered.append({
                "rule": "high_frequency",
                "risk": "medium",
                "detail": f"High tx count: {stats['tx_count']}",
            })

        return triggered
