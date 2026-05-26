"""资金流向追踪 — 构建有向图，支持递归追踪"""
from typing import Dict, List, Set, Any
from fetcher.evm import EVMFetcher


class FundFlowTracer:
    def __init__(self, fetcher: EVMFetcher, max_depth: int = 3):
        self.fetcher = fetcher
        self.max_depth = max_depth
        self.visited: Set[str] = set()

    def trace(self, address: str, contract_address: str) -> Dict[str, Any]:
        """从目标地址开始追踪资金流向"""
        self.visited = set()
        nodes: List[Dict] = []
        edges: List[Dict] = []
        counterparty_flows: Dict[str, Dict[str, float]] = {}
        total_sent = 0.0
        total_received = 0.0

        # 获取目标地址的直接交易
        txs = self.fetcher.get_transfers(address, contract_address)
        self.visited.add(address.lower())

        for tx in txs:
            from_lower = tx["from"].lower()
            to_lower = tx["to"].lower()

            # 构建边
            edges.append({
                "from": tx["from"],
                "to": tx["to"],
                "value": tx["value_eth"],
                "hash": tx["hash"],
                "block": tx["block"],
            })

            # 统计流向
            if from_lower == address.lower():
                total_sent += tx["value_eth"]
                cp = tx["to"]
                if cp not in counterparty_flows:
                    counterparty_flows[cp] = {"sent": 0.0, "received": 0.0}
                counterparty_flows[cp]["sent"] += tx["value_eth"]
            else:
                total_received += tx["value_eth"]
                cp = tx["from"]
                if cp not in counterparty_flows:
                    counterparty_flows[cp] = {"sent": 0.0, "received": 0.0}
                counterparty_flows[cp]["received"] += tx["value_eth"]

        # 构建节点列表（目标地址 + 所有对手方）
        nodes.append({
            "address": address,
            "depth": 0,
            "sent": round(total_sent, 4),
            "received": round(total_received, 4),
        })

        for cp_addr, flows in counterparty_flows.items():
            cp_node = {
                "address": cp_addr,
                "depth": 1,
                "sent": round(flows["sent"], 4),
                "received": round(flows["received"], 4),
            }

            # 一级对手方追溯
            if 1 < self.max_depth and cp_addr.lower() not in self.visited:
                self.visited.add(cp_addr.lower())
                cp_txs = self.fetcher.get_counterparty_transfers(cp_addr, contract_address)
                cp_node["counterparty_tx_count"] = len(cp_txs)

                # 追溯更深层（可选）
                cp_cp: Set[str] = set()
                for cp_tx in cp_txs:
                    other = cp_tx["to"] if cp_tx["from"].lower() == cp_addr.lower() else cp_tx["from"]
                    cp_cp.add(other)
                cp_node["counterparty_count"] = len(cp_cp)

            nodes.append(cp_node)

        # 排序：按交易量降序
        nodes.sort(key=lambda n: n["sent"] + n["received"], reverse=True)

        return {
            "nodes": nodes,
            "edges": edges,
            "total_sent": round(total_sent, 4),
            "total_received": round(total_received, 4),
            "max_depth": self.max_depth,
        }

    def format_flow_for_llm(self, flow: Dict) -> str:
        """将资金流数据格式化为 LLM 可读的文本"""
        lines = []
        lines.append(f"Flow Depth: {flow['max_depth']}")
        lines.append(f"Total Sent: {flow['total_sent']} | Total Received: {flow['total_received']}")
        lines.append(f"Nodes: {len(flow['nodes'])} | Edges: {len(flow['edges'])}")
        lines.append("")

        for node in flow["nodes"][:15]:
            depth_tag = "[TARGET]" if node["depth"] == 0 else f"[depth {node['depth']}]"
            lines.append(
                f"  {depth_tag} {node['address'][:14]}... "
                f"in={node['received']} out={node['sent']}"
            )
            if "counterparty_tx_count" in node:
                lines[-1] += f" (their_tx={node['counterparty_tx_count']})"

        if len(flow["edges"]) > 0 and len(flow["edges"]) <= 20:
            lines.append("\nEdges:")
            for edge in flow["edges"]:
                lines.append(
                    f"  {edge['from'][:10]}.. -> {edge['to'][:10]}.. = {edge['value']:.4f}"
                )

        return "\n".join(lines)
