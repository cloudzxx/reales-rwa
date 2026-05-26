"""结构化合规报告生成"""
from typing import Dict, List, Any
from datetime import datetime, timezone
import uuid


def generate_structured_report(
    address: str,
    chain: str,
    llm_result: dict,
    fund_flow: dict,
    labels: dict,
    audit_steps: List[Dict[str, str]],
) -> Dict[str, Any]:
    """生成企业级结构化合规报告"""

    report = {
        "case_id": f"RWA-COMP-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "version": "1.0",
        "subject": {
            "address": address,
            "chain": chain,
        },
        "risk_assessment": {
            "overall_score": llm_result.get("risk_score", 0),
            "level": llm_result.get("risk_level", "medium"),
            "dimensions": llm_result.get("risk_dimensions", {}),
        },
        "fund_flow": {
            "max_depth": fund_flow.get("max_depth", 1),
            "total_sent": fund_flow.get("total_sent", 0),
            "total_received": fund_flow.get("total_received", 0),
            "nodes": [
                {
                    "address": n["address"],
                    "label": labels.get(n["address"], {}).get("label"),
                    "type": labels.get(n["address"], {}).get("type", "unknown"),
                    "flow_in": n.get("received", 0),
                    "flow_out": n.get("sent", 0),
                    "depth": n.get("depth", 0),
                }
                for n in fund_flow.get("nodes", [])[:20]
            ],
            "edges": [
                {
                    "from": e["from"],
                    "to": e["to"],
                    "value": e["value"],
                    "tx_hash": e.get("hash", ""),
                }
                for e in fund_flow.get("edges", [])[:50]
            ],
        },
        "structured_report": llm_result.get("structured_report", {}),
        "recommendation": {
            "action": llm_result.get("recommended_action", "monitor"),
            "notes": llm_result.get("summary", ""),
        },
        "triggers": llm_result.get("triggers", []),
        "audit_trail": [
            {"step": step["stage"], "result": step["status"], "detail": step["detail"]}
            for step in audit_steps
        ],
        "unusual_tx": llm_result.get("unusual_tx", []),
    }

    return report
