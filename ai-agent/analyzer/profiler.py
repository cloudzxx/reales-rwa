"""地址画像分析 — 标记地址类型"""
from typing import Dict, List, Set
from config import label_address


class AddressProfiler:
    def __init__(self):
        self.label_cache: Dict[str, dict] = {}

    def profile(self, address: str) -> dict:
        """标记单个地址"""
        addr_lower = address.lower()
        if addr_lower in self.label_cache:
            return self.label_cache[addr_lower]

        label = label_address(address)
        self.label_cache[addr_lower] = label
        return label

    def profile_addresses(self, addresses: List[str]) -> Dict[str, dict]:
        """批量标记地址"""
        results = {}
        for addr in addresses:
            results[addr] = self.profile(addr)
        return results

    def format_labels_for_llm(self, labels: Dict[str, dict]) -> str:
        """格式化标签为 LLM 文本"""
        lines = []
        type_summary: Dict[str, int] = {"exchange": 0, "mixer": 0, "bridge": 0, "unknown": 0}
        for addr, label in labels.items():
            type_summary[label["type"]] += 1
            name = label["label"] or "Unknown"
            if label["type"] != "unknown":
                lines.append(f"  {addr[:14]}... → {label['type'].upper()}: {name}")

        lines.insert(0, f"Label Summary: {type_summary}")
        return "\n".join(lines)
