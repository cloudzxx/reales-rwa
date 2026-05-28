"""Solana 链上数据获取 — 解析 SPL Token 转移

与真实场景的差距：
- 真实系统同时监控 SPL Token Transfer + System Program SOL 转移 +
  Associated Token Account 变更 + Program 内部 CPInvoke 调用
- 真实系统会解析 DeFi 协议日志（Raydium Swap / Jupiter Aggregator），
  通过 decode_instruction 还原真实交易意图（swap vs transfer vs deposit）
- 真实系统使用 Geyser/gRPC 流式接收全量交易，非轮询
- 这里仅使用 Helius RPC 的 getSignaturesForAddress + getTransaction，
  每分钟数千条查询后会达到 Rate Limit
"""
from typing import List, Dict
from solana.rpc.api import Client
from solders.pubkey import Pubkey
from solders.signature import Signature

SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
SIGNATURE_LIMIT = 100
# 由于 Solana 只有 time-based 分片（slot），
# 无法像 EVM 一样做 block range 分片查询，
# 这里使用最新 N 笔签名代替范围查询
# 真实场景使用 DAS API (Digital Asset Standard) 做 token transfer 搜索


class SolanaFetcher:
    def __init__(self, client: Client):
        self.client = client

    def get_balance(self, address: str) -> float:
        try:
            resp = self.client.get_balance(Pubkey.from_string(address))
            return resp.value / 1e9
        except Exception:
            return 0.0

    def _parse_spl_transfers(self, tx_data: dict, owner: str) -> List[Dict]:
        """从交易中解析 SPL Token transfer

        真实场景解析逻辑：
        - 需要 decode CPI instructions 链（Program Id、Accounts、Data）
        - 解析 TransferChecked / Transfer / Burn / MintTo 等所有指令
        - 判断交易意图（swap 中有大量 transfer 但资金流向不同）
        - 这里仅提取第一层 SPL Transfer，不追踪 CPI 嵌套
        """
        transfers = []
        meta = tx_data.get("meta", {})
        if not meta:
            return transfers
        pre_balances = meta.get("preTokenBalances", [])
        post_balances = meta.get("postTokenBalances", [])
        owner_lower = owner.lower()

        # 真实场景使用 decoded balance diff 来精确判断变化量，
        # 这里用 pre/post token balance 的差值近似计算
        balance_map = {}
        for pb in pre_balances:
            key = (pb.get("accountIndex"), pb.get("mint"))
            balance_map.setdefault(key, {"pre": pb.get("uiTokenAmount", {}).get("uiAmount"), "post": None})
        for pb in post_balances:
            key = (pb.get("accountIndex"), pb.get("mint"))
            if key in balance_map:
                balance_map[key]["post"] = pb.get("uiTokenAmount", {}).get("uiAmount")
            else:
                balance_map[key] = {"pre": None, "post": pb.get("uiTokenAmount", {}).get("uiAmount")}

        for key, change in balance_map.items():
            pre = change["pre"]
            post = change["post"]
            if pre is not None and post is not None and pre != post:
                diff = post - pre
                tx_sig = tx_data.get("transaction", {}).get("signatures", [""])[0]
                transfers.append({
                    "hash": tx_sig,
                    "mint": key[1] if len(key) > 1 else "unknown",
                    "amount": abs(diff),
                    "direction": "in" if diff > 0 else "out",
                    "value": abs(diff),
                })
        return transfers

    def get_spl_transfers(self, address: str, mint_address: str = None) -> List[Dict]:
        """获取 SPL Token 转移记录

        与真实场景的差距：
        - 真实系统通过 DAS API (Digital Asset Standard)
          /v0/tokens/ transfers 直接查询 token transfer 历史
        - 这里使用 getSignaturesForAddress（最高支持 1000 条签名）
        - 无法按时间范围过滤（Solana RPC 不支持 time-based 过滤）
        """
        pubkey = Pubkey.from_string(address)
        try:
            sigs = self.client.get_signatures_for_address(
                pubkey, limit=SIGNATURE_LIMIT
            )
            sig_list = sigs.value if sigs.value else []
        except Exception:
            sig_list = []
        tx_hashes = [s.signature for s in sig_list]

        txs = []
        for sig in tx_hashes:
            try:
                tx_resp = self.client.get_transaction(
                    Signature.from_string(str(sig)),
                    max_supported_transaction_version=0,
                    encoding="jsonParsed",
                )
                if tx_resp and tx_resp.value:
                    tx_data = tx_resp.value.to_json()
                    import json
                    if isinstance(tx_data, str):
                        tx_data = json.loads(tx_data)
                    parsed = self._parse_spl_transfers(tx_data, address)
                    txs.extend(parsed)
            except Exception:
                continue
        return txs
