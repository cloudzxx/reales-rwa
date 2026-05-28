"""资金流向追踪构建

与真实场景的差距：
- 真实系统使用图数据库（Neo4j / TigerGraph）存储和处理资金流，
  支持实时图遍历（如找 3 度内到混币器的路径），这里用内存 dict
- 真实系统追踪跨链流（CCTP / Wormhole / LayerZero），
  通过 relayer 地址和 log 关联两端交易
- 真实系统使用时间衰减权重（近期交易权重 > 90 天前），
  这里仅计数
- 链跟踪深度在真实场景中是动态的（一直追溯到无风险源头或 100+ 层），
  这里固定为 EVM 3 层
"""
from typing import List, Dict


def build_flow_graph(txs: List[Dict], max_nodes: int = 50) -> Dict:
    """跨链通用的资金流向图构建

    输入交易列表，输出：
    - nodes: [{id, label, type, total_sent, total_received, tx_count}]
    - edges: [{from, to, value, value_eth, hash}]
    - total_sent / total_received

    注意：这里仅展示直接交易关系，不做资金归并。
    真实场景中对同一地址的多次小交易会按天汇总，
    减少图复杂度但保留异常检测的时间粒度。
    """
    nodes: Dict[str, Dict] = {}
    edges: List[Dict] = []
    total_sent = 0.0
    total_received = 0.0

    for tx in txs[:200]:
        from_addr = tx.get("from", "").lower()
        to_addr = tx.get("to", "").lower()
        value_eth = tx.get("value_eth") or tx.get("value", 0)
        try:
            value_eth = float(value_eth)
        except (TypeError, ValueError):
            continue
        if not from_addr or not to_addr:
            continue

        if from_addr not in nodes:
            nodes[from_addr] = {"id": from_addr, "label": None, "type": "address", "total_sent": 0.0, "total_received": 0.0, "tx_count": 0}
        if to_addr not in nodes:
            nodes[to_addr] = {"id": to_addr, "label": None, "type": "address", "total_sent": 0.0, "total_received": 0.0, "tx_count": 0}

        nodes[from_addr]["total_sent"] += value_eth
        nodes[from_addr]["tx_count"] += 1
        nodes[to_addr]["total_received"] += value_eth
        nodes[to_addr]["tx_count"] += 1

        total_sent += value_eth
        total_received += value_eth

        edges.append({
            "from": from_addr,
            "to": to_addr,
            "value": value_eth,
            "value_eth": value_eth,
            "hash": tx.get("hash", ""),
        })

    # 按交易量排序取前 N 个节点
    sorted_nodes = sorted(nodes.values(), key=lambda n: n["total_sent"] + n["total_received"], reverse=True)[:max_nodes]
    node_ids = {n["id"] for n in sorted_nodes}

    return {
        "nodes": sorted_nodes,
        "edges": [e for e in edges if e["from"] in node_ids or e["to"] in node_ids],
        "total_sent": total_sent,
        "total_received": total_received,
    }


class FundFlowTracer:
    """可选的递归资金追溯

    对于 EVM，支持指定 max_depth，连续向上追溯资金来源。
    EVM 中交易可追踪（同一合约的前后事件通过 block context 关联），
    Solana 中无顺序关联，不适用此递归模式。

    真实系统中 FundFlowTracer 会：
    - 对每个地址设置「风险传播系数」（与高危地址相邻 → 得分为相邻节点的一半）
    - 使用 BFS/DFS 遍历整个交易子图，按资金占比裁剪
    - 标注循环路径（洗钱常见模式：A→B→C→A）
    - 与跨链桥事件关联，追踪跨链资金
    """
    def __init__(self, fetcher, max_depth: int = 3):
        self.fetcher = fetcher
        self.max_depth = max_depth

    def trace(self, address: str, contract_address: str, depth: int = 0) -> List[Dict]:
        if depth >= self.max_depth:
            return []
        txs = self.fetcher.get_counterparty_transfers(address, contract_address)
        all_txs = list(txs)
        seen = {address.lower()}
        for tx in txs:
            counterparty = tx.get("to", "").lower()
            if counterparty not in seen and counterparty != address.lower():
                seen.add(counterparty)
                deeper = self.trace(counterparty, contract_address, depth + 1)
                all_txs.extend(deeper)
        return all_txs
