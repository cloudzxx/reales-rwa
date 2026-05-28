"""资金流向追踪 — 构建有向图，支持递归追踪"""
from typing import Dict, List, Set, Any, Callable
from fetcher.evm import EVMFetcher


def build_flow_graph(
    address: str,
    transfers: List[Dict],
) -> Dict[str, Any]:
    """从转账记录构建资金流向图（链无关）"""
    nodes: List[Dict] = []
    edges: List[Dict] = []
    counterparty_flows: Dict[str, Dict[str, float]] = {}
    total_sent = 0.0
    total_received = 0.0
    addr_lower = address.lower()

    for tx in transfers:
        from_lower = tx["from"].lower()
        to_lower = tx["to"].lower()
        val = tx.get("value_eth") or tx.get("value", 0)

        edges.append({
            "from": tx["from"],
            "to": tx["to"],
            "value": val,
            "hash": tx["hash"],
            "block": tx.get("block") or tx.get("slot", 0),
        })

        if from_lower == addr_lower:
            total_sent += val
            cp = tx["to"]
            counterparty_flows.setdefault(cp, {"sent": 0.0, "received": 0.0})
            counterparty_flows[cp]["sent"] += val
        else:
            total_received += val
            cp = tx["from"]
            counterparty_flows.setdefault(cp, {"sent": 0.0, "received": 0.0})
            counterparty_flows[cp]["received"] += val

    nodes.append({
        "address": address,
        "depth": 0,
        "sent": round(total_sent, 4),
        "received": round(total_received, 4),
    })

    for cp_addr, flows in counterparty_flows.items():
        nodes.append({
            "address": cp_addr,
            "depth": 1,
            "sent": round(flows["sent"], 4),
            "received": round(flows["received"], 4),
        })

    nodes.sort(key=lambda n: n["sent"] + n["received"], reverse=True)

    return {
        "nodes": nodes,
        "edges": edges,
        "total_sent": round(total_sent, 4),
        "total_received": round(total_received, 4),
        "max_depth": 1,
    }


class FundFlowTracer:
    def __init__(self, fetcher: EVMFetcher, max_depth: int = 3):
        self.fetcher = fetcher
        self.max_depth = max_depth
        self.visited: Set[str] = set()

    def trace(self, address: str, contract_address: str) -> Dict[str, Any]:
        self.visited = set()
        addr_lower = address.lower()
        self.visited.add(addr_lower)

        txs = self.fetcher.get_transfers(address, contract_address)
        flow = build_flow_graph(address, txs)

        if self.max_depth <= 1:
            return flow

        for node in list(flow["nodes"]):
            if node["depth"] != 1:
                continue
            cp_addr = node["address"]
            cp_lower = cp_addr.lower()
            if cp_lower in self.visited:
                continue
            self.visited.add(cp_lower)

            cp_txs = self.fetcher.get_counterparty_transfers(cp_addr, contract_address)
            node["counterparty_tx_count"] = len(cp_txs)

            deeper_edges = []
            for tx in cp_txs:
                other = tx["to"] if tx["from"].lower() == cp_lower else tx["from"]
                if other.lower() not in self.visited:
                    deeper_edges.append({
                        "from": tx["from"],
                        "to": tx["to"],
                        "value": tx["value_eth"],
                        "hash": tx["hash"],
                    })

            if deeper_edges:
                node["counterparty_count"] = len(set(
                    e["to"] if e["from"].lower() == cp_lower else e["from"]
                    for e in deeper_edges
                ))

            flow["edges"].extend(deeper_edges)
            for e in deeper_edges:
                other_addr = e["to"] if e["from"].lower() == cp_lower else e["from"]
                if not any(n["address"].lower() == other_addr.lower() for n in flow["nodes"]):
                    flow["nodes"].append({
                        "address": other_addr,
                        "depth": 2,
                        "sent": 0,
                        "received": 0,
                    })

        flow["max_depth"] = self.max_depth
        return flow

    def format_flow_for_llm(self, flow: Dict) -> str:
        lines = []
        lines.append(f"Flow Depth: {flow['max_depth']}")
        lines.append(f"Total Sent: {flow['total_sent']} | Total Received: {flow['total_received']}")
        lines.append(f"Nodes: {len(flow['nodes'])} | Edges: {len(flow['edges'])}")
        lines.append("")

        for node in flow["nodes"][:15]:
            depth_tag = "[TARGET]" if node["depth"] == 0 else f"[depth {node['depth']}]"
            line = (
                f"  {depth_tag} {node['address'][:14]}... "
                f"in={node['received']} out={node['sent']}"
            )
            if "counterparty_tx_count" in node:
                line += f" (their_tx={node['counterparty_tx_count']})"
            lines.append(line)

        if len(flow["edges"]) > 0 and len(flow["edges"]) <= 20:
            lines.append("\nEdges:")
            for edge in flow["edges"]:
                lines.append(
                    f"  {edge['from'][:10]}.. -> {edge['to'][:10]}.. = {edge['value']:.4f}"
                )

        return "\n".join(lines)
