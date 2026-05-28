"""多维度风险评估

与真实场景的差距：
- 真实风控系统（如 Elliptic / Chainalysis KYT）使用 XGBoost/LightGBM
  模型，输入 200+ 维特征，输出校准后的概率分数
- 每个维度有独立的模型权重，通过历史违规交易反向校准
- 评分不是简单的线性加权，而是使用 SHAP 值可解释的集成模型
- 真实系统会输出具体的风险处置建议而非分数：
  - 通过（score < 0.3）
  - 增强 KYC（0.3 ≤ score < 0.6）
  - 人工审核（0.6 ≤ score < 0.85）
  - 自动冻结（score ≥ 0.85）
- 真实系统的 4 个维度之间有交叉惩罚项
  （如 mixer + 高频 = 暴增风险，不单是 40+35 的简单加法）
"""
from typing import Dict, List, Any


class RiskAnalyzer:
    def __init__(self):
        # 真实系统中每个维度有独立的 ML 模型，
        # 以下权重仅为 demo 调试值，未做统计校准
        self.weights = {
            "counterparty_risk": 0.10,
            "flow_complexity": 0.40,
            "anomaly_score": 0.35,
            "behavior_consistency": 0.15,
        }
        # 真实系统中这些模型每周重新训练，
        # 使用最新的链上违规地址作为负样本

    def evaluate(self, profiles: Dict, fund_flow: Dict, stats: Dict) -> Dict[str, Any]:
        """计算 4 维风险评估

        真实系统每个维度的评分逻辑：
        - counterparty_risk: 与高危地址直接/间接交互的图距离 + 交互资金占比
          在这里简化为 "是否有混币器交互？" 的开关判断
        - flow_complexity: 资金流图的中介中心度 + 环路检测
          在这里简化为 "节点和边的数量"
        - anomaly_score: 基于该地址历史行为的 z-score 偏离度
          在这里简化为 "交易数量 > 阈值" 的开关判断
        - behavior_consistency: 交易间隔的方差分析
          在这里总是 0.0（无历史基线）
        """

        # —— 维度 1: 对手方风险 ——
        # 真实场景：向混币器转账金额 / 总金额 的比率，
        # 结合混币器上下游延伸风险传播
        cp_risk = 0.0
        for addr, p in profiles.items():
            if p.get("is_mixer"):
                cp_risk = 1.0
                break
            if p.get("is_sanctioned"):
                cp_risk = 1.0
                break
            if p.get("is_exchange"):
                cp_risk = 0.3
        # 真实系统还会 check 该地址是否在被监管机构关注的区域
        # （如伊朗/朝鲜关联地址）

        # —— 维度 2: 资金流复杂度 ——
        # 真实场景：图的中介中心度最高路径长度、环路检测
        # 结构化金融产品（RWA/STO）默认有合格投资者互转，复杂度低
        # 极端洗钱路径：A→交换所→B→混币器→C→D 通常在 5+ 层
        node_count = len(fund_flow.get("nodes", []))
        edge_count = len(fund_flow.get("edges", []))
        flow_complexity = 0.0
        if node_count > 0 and edge_count > 0:
            # 真实系统使用平均路径长度 / 图密度
            # 这里用边数占比做简单判断
            ratio = edge_count / max(node_count, 1)
            if ratio > 3.0:
                flow_complexity = 0.9
            elif ratio > 2.0:
                flow_complexity = 0.6
            elif ratio > 1.0:
                flow_complexity = 0.3

        # —— 维度 3: 异常检测 ——
        # 真实场景：基于该地址历史 30/90/180 天行为基线，
        # 使用 Martingale 或 Isolation Forest 做实时异常检测
        # 跨链异常：同一地址在 ETH 和 BSC 同时高频交易
        anomaly = 0.0
        tx_count = stats.get("tx_count", 0)
        sent = stats.get("total_sent", 0)
        received = stats.get("total_received", 0)
        if tx_count > 100:
            anomaly = 0.8
        elif tx_count > 50:
            anomaly = 0.5
        elif tx_count > 10:
            anomaly = 0.2
        # 大金额出入不平衡也可能是异常（短时间大量入金 → 出金）
        if sent > 0 and received > 0:
            ratio_sr = sent / max(received, 0.01)
            if ratio_sr > 5 or ratio_sr < 0.2:
                anomaly = max(anomaly, 0.6)

        # —— 维度 4: 行为一致性 ——
        # 真实场景：
        # - 分析 gas 价格的方差（bot 总是用固定 gas）
        # - 分析交易间隔的方差（规律交易 vs 随机交易）
        # - 分析交易时间的分布（只在 UTC+0 凌晨活跃 = 高风险）
        # 这里无历史基线，始终返回 0
        behavior_consistency = 0.0

        dimensions = {
            "counterparty_risk": round(cp_risk * 100),
            "flow_complexity": round(flow_complexity * 100),
            "anomaly_score": round(anomaly * 100),
            "behavior_consistency": round(behavior_consistency * 100),
        }

        overall = round(
            dimensions["counterparty_risk"] * self.weights["counterparty_risk"]
            + dimensions["flow_complexity"] * self.weights["flow_complexity"]
            + dimensions["anomaly_score"] * self.weights["anomaly_score"]
            + dimensions["behavior_consistency"] * self.weights["behavior_consistency"]
        )
        overall = max(0, min(100, overall))

        return {
            "overall_score": overall,
            "level": "high" if overall >= 70 else ("medium" if overall >= 40 else "low"),
            "dimensions": dimensions,
        }
