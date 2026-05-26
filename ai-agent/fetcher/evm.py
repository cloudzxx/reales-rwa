"""EVM 链上数据获取"""
from typing import List, Dict, Tuple
from web3 import Web3

TRANSFER_EVENT_SIGNATURE = Web3.keccak(text="Transfer(address,address,uint256)")

class EVMFetcher:
    def __init__(self, w3: Web3):
        self.w3 = w3

    def get_transfers(self, address: str, contract_address: str) -> List[Dict]:
        """获取地址相关的 Transfer 事件"""
        address = self.w3.to_checksum_address(address)
        contract_address = self.w3.to_checksum_address(contract_address)
        topic = TRANSFER_EVENT_SIGNATURE
        from_padded = "0x" + address[2:].lower().rjust(64, "0")
        to_padded = "0x" + address[2:].lower().rjust(64, "0")

        try:
            from_logs = self.w3.eth.get_logs({
                "address": contract_address,
                "fromBlock": 0, "toBlock": "latest",
                "topics": [topic, from_padded],
            })
            to_logs = self.w3.eth.get_logs({
                "address": contract_address,
                "fromBlock": 0, "toBlock": "latest",
                "topics": [topic, None, to_padded],
            })
        except Exception:
            return []

        txs = []
        for log in from_logs + to_logs:
            from_addr = "0x" + log["topics"][1].hex()[-40:]
            to_addr = "0x" + log["topics"][2].hex()[-40:]
            value = int(log["data"].hex(), 16) if log["data"] != "0x" else 0
            txs.append({
                "hash": log["transactionHash"].hex(),
                "from": from_addr,
                "to": to_addr,
                "value_wei": value,
                "value_eth": float(self.w3.from_wei(value, "ether")),
                "block": log["blockNumber"],
            })
        return txs

    def get_counterparty_transfers(self, address: str, contract_address: str) -> List[Dict]:
        """获取对手方的一级交易（用于资金链追踪）"""
        return self.get_transfers(address, contract_address)

    def get_transaction_count(self, address: str) -> int:
        """获取地址的总交易数（nonce）"""
        try:
            return self.w3.eth.get_transaction_count(address)
        except Exception:
            return 0
