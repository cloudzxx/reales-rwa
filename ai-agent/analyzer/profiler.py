"""地址画像 — 标记地址类型和交易行为特征

与真实场景的差距：
- 真实画像系统综合 200+ 维特征：
  交易时间模式（UTC +8 活跃 → 亚洲用户）、gas 价格敏感度、
  DeFi 交互历史（Uniswap / Aave 数量）、NFT 持有量、
  ENS 域名注册时长、L2 使用频率、跨链桥偏好
- 真实系统使用集群画像（如 Chainalysis 的 Cluster），
  同一团伙的多地址聚合后统一标记
- 真实系统维护地址之间的「关系图谱」
  （共同出资人、交互频次、交互独特性）
"""
from typing import Dict, List
from config import label_address, KNOWN_EXCHANGES, KNOWN_MIXERS, KNOWN_BRIDGES, SANCTIONED_ADDRESSES


# 简易地址类型判定 — 真实系统使用 ML 模型（XGBoost/LightGBM）,
# 训练特征包括：首次交易距今天数、中间地址数、gas 费分布、交易间隔熵值等
def _simple_classify(addr: str) -> str:
    """基于地址模式做初步分类

    仅做演示用途，真实场景需要：
    1. 链上行为聚类
    2. 合约交互分析（调用 Uniswap Router 即标记为 DeFi User）
    3. 外部数据交叉（CoinGecko: token issuer = project 地址）
    """
    labeled = label_address(addr)
    if labeled["type"] != "unknown":
        return labeled["type"]
    addr_lower = addr.lower()
    # 空地址（新创建的合约/新钱包）— 真实系统风险评分更高
    if addr_lower == "0x0000000000000000000000000000000000000000":
        return "burn_address"
    # 合约地址启发式 — 真实系统使用字节码分析（is_contract = bytecode ≠ 0x）
    # 这里仅判断长度，误报率高
    if addr_lower.startswith("0x") and len(addr_lower) == 42:
        return "likely_eoa"
    return "unknown"


class Profiler:
    def __init__(self):
        pass

    def profile(self, addresses: List[str]) -> Dict[str, Dict]:
        """对地址列表进行画像

        真实系统会同时返回：
        - risk_score: 该地址历史风险评分
        - first_seen: 首次与已知不良地址交互的时间
        - cluster_id: 所属团伙 ID
        - tags: ["defi_user", "nft_trader", "low_gas_nonce_pattern"]
        """
        profiles = {}
        for addr in addresses:
            addr_lower = addr.lower()
            labeled = label_address(addr_lower)
            addr_type = labeled["type"]
            label = labeled["label"]
            profiles[addr_lower] = {
                "address": addr_lower,
                "type": addr_type,
                "label": label,
                "classification": _simple_classify(addr_lower),
                # 真实系统这里会返回该地址在混币器/交易所的出入金比率
                # （如：total_deposit_to_mixer / total_volume），辅助判断洗钱概率
                "is_exchange": addr_type == "exchange",
                "is_mixer": addr_type == "mixer",
                "is_bridge": addr_type == "bridge",
                "is_sanctioned": addr_type == "sanctioned",
                "is_contract": addr_type != "likely_eoa" and addr_type != "unknown",
            }
        return profiles
