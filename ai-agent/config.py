"""已知地址标签数据库"""
# 交易所热钱包 / 存款地址
KNOWN_EXCHANGES = {
    # Ethereum
    "0x28c6c06298d514db089934071355e5743bf21d60": "Binance Hot Wallet",
    "0x21a31ee1afc51d94c2efccaa2092ad1028285549": "Binance Hot Wallet 2",
    "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": "Coinbase Hot Wallet",
    "0x71660c4005ba85c37c5765c0df2b2e0dbb6bcef1": "Coinbase 2",
    "0x75e89d5979e4f6fba9f97c104c2f0afb3f1dcb88": "OKX Hot Wallet",
    "0x1ab4973a48dc892cd9971ece8e01dcc7688f8f23": "Bybit Hot Wallet",
    "0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503": "Kraken Hot Wallet",
    "0xf89d7b9c864f589bbf53a82105107622b35eaa40": "KuCoin Hot Wallet",
}

# 混币器合约（Tornado Cash 等）
KNOWN_MIXERS = {
    "0xa160cdab225685da1d56aa342ad8841c3b53f291": "Tornado Cash 0.1 ETH",
    "0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc": "Tornado Cash 1 ETH",
    "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936": "Tornado Cash 10 ETH",
    "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf": "Tornado Cash 100 ETH",
    "0xd96f2b1c14db8458374d9aca76e26c3d18364307": "Tornado Cash Governance",
}

# 跨链桥合约
KNOWN_BRIDGES = {
    "0x3ee18b2214aff97000d974cf647e7c347e8fa585": "Wormhole Bridge (ETH)",
    "0x66a71dcef29a0ffbdbe3c6a460a3b5bc225cd675": "LayerZero Bridge",
    "0x841ce48f9446c8e281d22f3f18595c914f5c5e44": "Celer Bridge",
}

def label_address(addr: str) -> dict:
    """根据已知地址库标记地址类型"""
    addr_lower = addr.lower()
    for ex_addr, name in KNOWN_EXCHANGES.items():
        if addr_lower == ex_addr.lower():
            return {"type": "exchange", "label": name}
    for mix_addr, name in KNOWN_MIXERS.items():
        if addr_lower == mix_addr.lower():
            return {"type": "mixer", "label": name}
    for br_addr, name in KNOWN_BRIDGES.items():
        if addr_lower == br_addr.lower():
            return {"type": "bridge", "label": name}
    return {"type": "unknown", "label": None}
