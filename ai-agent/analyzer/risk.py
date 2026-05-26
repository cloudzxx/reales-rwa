"""多维风险评分引擎"""
from typing import Dict, Any


def compute_multi_dimension_risk(
    flow: Dict[str, Any],
    labels: Dict[str, dict],
    stats: Dict[str, float],
) -> Dict[str, Any]:
    """计算四个维度的风险评分"""

    dimensions = {}

    # 1. 资金来源风险
    mixer_count = sum(1 for l in labels.values() if l["type"] == "mixer")
    exchange_count = sum(1 for l in labels.values() if l["type"] == "exchange")
    unknown_count = sum(1 for l in labels.values() if l["type"] == "unknown")

    fund_source_score = min(100, unknown_count * 10 + mixer_count * 40)
    fund_source_level = _level(fund_source_score)
    dimensions["fund_source_risk"] = {
        "score": fund_source_score,
        "level": fund_source_level,
        "detail": f"{mixer_count} mixers, {exchange_count} exchanges, {unknown_count} unknown among counterparties",
    }

    # 2. 行为风险
    tx_count = stats.get("tx_count", 0)
    cp_count = stats.get("counterparties", 0)
    behavior_score = min(100, tx_count * 2 + cp_count * 3)
    behavior_level = _level(behavior_score)
    dimensions["behavior_risk"] = {
        "score": behavior_score,
        "level": behavior_level,
        "detail": f"{tx_count} txs with {cp_count} counterparties",
    }

    # 3. 对手方风险
    total_cp = len(labels) if labels else stats.get("counterparties", 0)
    high_risk_cp = mixer_count
    cp_score = min(100, (high_risk_cp / max(total_cp, 1)) * 100)
    cp_level = _level(cp_score)
    dimensions["counterparty_risk"] = {
        "score": round(cp_score),
        "level": cp_level,
        "detail": f"{high_risk_cp}/{total_cp} counterparties are high-risk",
    }

    # 4. 监管风险
    regulatory_score = min(100, mixer_count * 35 + max(0, tx_count - 50) * 1)
    regulatory_level = _level(regulatory_score)
    dimensions["regulatory_risk"] = {
        "score": regulatory_score,
        "level": regulatory_level,
        "detail": f"Mixer interaction present: {mixer_count > 0}",
    }

    return dimensions


def compute_overall_risk(dimensions: Dict[str, Any]) -> Dict[str, Any]:
    """加权平均计算总体风险"""
    weights = {
        "fund_source_risk": 0.3,
        "behavior_risk": 0.2,
        "counterparty_risk": 0.25,
        "regulatory_risk": 0.25,
    }
    weighted_sum = sum(
        dimensions[k]["score"] * weights.get(k, 0) for k in dimensions
    )
    overall = round(weighted_sum)
    return {
        "score": overall,
        "level": _level(overall),
        "dimensions": dimensions,
    }


def _level(score: float) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 30:
        return "medium"
    return "low"
