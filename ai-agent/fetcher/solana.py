"""Solana 链上数据获取"""
import requests
from typing import List, Dict

class SolanaFetcher:
    def __init__(self, rpc_url: str = "http://127.0.0.1:8899"):
        self.rpc_url = rpc_url

    def _rpc_call(self, method: str, params: list) -> dict:
        resp = requests.post(
            self.rpc_url,
            json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
            timeout=10,
        )
        return resp.json()

    def get_signatures(self, address: str, limit: int = 30) -> List[str]:
        """获取地址最近的交易签名"""
        sigs_resp = self._rpc_call("getSignaturesForAddress", [address, {"limit": limit}])
        return [s["signature"] for s in sigs_resp.get("result", [])]

    def get_transaction(self, signature: str) -> dict | None:
        """获取单个交易的解析数据"""
        resp = self._rpc_call("getTransaction", [
            signature, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}
        ])
        return resp.get("result")

    def get_counterparties(self, address: str, limit: int = 20) -> List[Dict]:
        """获取对手方及其交互次数"""
        sigs = self.get_signatures(address, limit)
        if not sigs:
            return []

        cp_map: Dict[str, int] = {}
        for sig in sigs:
            tx = self.get_transaction(sig)
            if tx:
                accounts = tx.get("transaction", {}).get("message", {}).get("accountKeys", [])
                for acc in accounts:
                    addr_str = acc.get("pubkey", "")
                    if addr_str.lower() != address.lower():
                        cp_map[addr_str] = cp_map.get(addr_str, 0) + 1

        return [{"address": k, "interactions": v}
                for k, v in sorted(cp_map.items(), key=lambda x: x[1], reverse=True)]
