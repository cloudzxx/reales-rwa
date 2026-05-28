"""Solana 链上数据获取 — 支持 SPL Token 转账解析"""
import requests
from typing import List, Dict, Optional

SPL_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"


class SolanaFetcher:
    def __init__(self, rpc_url: str = "http://127.0.0.1:8899"):
        self.rpc_url = rpc_url

    def _rpc_call(self, method: str, params: list) -> dict:
        resp = requests.post(
            self.rpc_url,
            json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
            timeout=15,
        )
        return resp.json()

    def get_signatures(self, address: str, limit: int = 100) -> List[str]:
        sigs_resp = self._rpc_call("getSignaturesForAddress", [address, {"limit": limit}])
        return [s["signature"] for s in sigs_resp.get("result", [])]

    def get_transaction(self, signature: str) -> Optional[dict]:
        resp = self._rpc_call("getTransaction", [
            signature, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}
        ])
        return resp.get("result")

    def get_token_transfers(self, address: str, limit: int = 100) -> List[Dict]:
        sigs = self.get_signatures(address, limit)
        transfers = []
        for sig in sigs:
            tx = self.get_transaction(sig)
            if not tx:
                continue
            transfers.extend(self._parse_token_transfers(tx, address))
        return transfers

    def _parse_token_transfers(self, tx: dict, target_address: str) -> List[Dict]:
        transfers = []
        signatures = tx.get("transaction", {}).get("signatures", [])
        tx_hash = signatures[0] if signatures else ""
        slot = tx.get("slot", 0)
        block_time = tx.get("blockTime", 0)
        target_lower = target_address.lower()

        for inst in self._all_instructions(tx):
            if inst.get("programId") != SPL_TOKEN_PROGRAM:
                continue
            parsed = inst.get("parsed", {})
            if parsed.get("type") not in ("transfer", "transferChecked"):
                continue
            info = parsed.get("info", {})
            source = info.get("source", "")
            dest = info.get("destination", "")

            if source.lower() != target_lower and dest.lower() != target_lower:
                continue

            raw_amount = int(info.get("amount", 0))
            decimals = 9
            token_amount = info.get("tokenAmount")
            if token_amount:
                decimals = token_amount.get("decimals", 9)
            ui_amount = raw_amount / (10 ** decimals) if decimals > 0 else raw_amount

            transfers.append({
                "hash": tx_hash,
                "from": source,
                "to": dest,
                "value": ui_amount,
                "value_raw": raw_amount,
                "slot": slot,
                "block_time": block_time,
            })

        return transfers

    def _all_instructions(self, tx: dict) -> List[dict]:
        instructions = []
        msg = tx.get("transaction", {}).get("message", {})
        instructions.extend(msg.get("instructions", []))
        meta = tx.get("meta", {})
        for inner_group in meta.get("innerInstructions", []):
            instructions.extend(inner_group.get("instructions", []))
        return instructions

    def get_counterparties(self, address: str, limit: int = 20) -> List[Dict]:
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
