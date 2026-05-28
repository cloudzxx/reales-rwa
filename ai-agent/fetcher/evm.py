"""EVM 链上数据获取 — 分块查询避免 RPC 限制"""
from typing import List, Dict
from web3 import Web3

TRANSFER_EVENT_SIGNATURE = Web3.keccak(text="Transfer(address,address,uint256)")
MAX_BLOCK_RANGE = 200  # 每次查询的最大区块范围

class EVMFetcher:
    def __init__(self, w3: Web3):
        self.w3 = w3

    def _chunked_get_logs(self, contract: str, from_block: int, to_block: int, topics: list) -> List[Dict]:
        """分块查询 eth_getLogs，绕过 RPC 区块范围限制"""
        all_logs = []
        current = from_block
        while current < to_block:
            end = min(current + MAX_BLOCK_RANGE, to_block)
            try:
                logs = self.w3.eth.get_logs({
                    "address": contract,
                    "fromBlock": hex(current),
                    "toBlock": hex(end),
                    "topics": topics,
                })
                all_logs.extend(logs)
            except Exception:
                pass
            current = end + 1
        return all_logs

    def get_transfers(self, address: str, contract_address: str, max_blocks: int = 0) -> List[Dict]:
        """获取地址相关的 Transfer 事件（分块查询）"""
        address = self.w3.to_checksum_address(address)
        contract_address = self.w3.to_checksum_address(contract_address)
        topic = TRANSFER_EVENT_SIGNATURE
        from_padded = "0x" + address[2:].lower().rjust(64, "0")
        to_padded = "0x" + address[2:].lower().rjust(64, "0")

        # 确定查询区间
        latest = self.w3.eth.block_number
        if max_blocks > 0:
            from_block = max(0, latest - max_blocks)
        else:
            from_block = max(0, latest - 50000)  # 默认最近 50000 块

        # 分块查询出账 + 入账
        all_logs = []
        all_logs += self._chunked_get_logs(contract_address, from_block, latest, [topic, from_padded])
        all_logs += self._chunked_get_logs(contract_address, from_block, latest, [topic, None, to_padded])

        txs = []
        seen_hashes = set()
        for log in all_logs:
            tx_hash = log["transactionHash"].hex()
            if tx_hash in seen_hashes:
                continue
            seen_hashes.add(tx_hash)
            from_addr = "0x" + log["topics"][1].hex()[-40:]
            to_addr = "0x" + log["topics"][2].hex()[-40:]
            value = int(log["data"].hex(), 16) if log["data"] != "0x" else 0
            txs.append({
                "hash": tx_hash,
                "from": from_addr,
                "to": to_addr,
                "value_wei": value,
                "value_eth": float(self.w3.from_wei(value, "ether")),
                "block": log["blockNumber"],
            })
        return txs

    def get_counterparty_transfers(self, address: str, contract_address: str) -> List[Dict]:
        """获取对手方的一级交易"""
        return self.get_transfers(address, contract_address)

    def get_transaction_count(self, address: str) -> int:
        """获取地址的总交易数（nonce）"""
        try:
            return self.w3.eth.get_transaction_count(address)
        except Exception:
            return 0
