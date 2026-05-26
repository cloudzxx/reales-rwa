"""LLM Prompt 模板"""
from langchain_core.prompts import ChatPromptTemplate

# 结构化合规分析主 Prompt
STRUCTURED_ANALYSIS_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a senior blockchain compliance analyst. Analyze the subject address and produce a detailed, structured risk report.

Respond ONLY with a JSON object in this exact format (no markdown, no backticks):
{{
  "risk_score": <integer 0-100>,
  "risk_level": "<low|medium|high|critical>",
  "behavior_profile": "<one-line summary of behavior>",
  "risk_dimensions": {{
    "fund_source_risk": {{ "score": <0-100>, "level": "<low|medium|high|critical>", "detail": "<why>" }},
    "behavior_risk": {{ "score": <0-100>, "level": "<low|medium|high|critical>", "detail": "<why>" }},
    "counterparty_risk": {{ "score": <0-100>, "level": "<low|medium|high|critical>", "detail": "<why>" }},
    "regulatory_risk": {{ "score": <0-100>, "level": "<low|medium|high|critical>", "detail": "<why>" }}
  }},
  "structured_report": {{
    "overview": "<2-3 sentences profiling the address>",
    "fund_flow_analysis": "<2-3 sentences on where funds come from and go>",
    "risk_assessment": "<2-3 sentences assessing specific risks>",
    "recommendations": "<2-3 sentences recommending actions>"
  }},
  "unusual_tx": [<list of suspicious tx hashes or descriptions>],
  "summary": "<1 sentence overall summary>",
  "recommended_action": "<pass|review|freeze|monitor>"
}}

Risk analysis framework:
- fund_source_risk: Are funds from known exchanges (low risk), unknown wallets (medium), or mixers (high)?
- behavior_risk: Is the transaction pattern normal or suspicious (rapid transfers, round amounts)?
- counterparty_risk: Who are the counterparties — exchanges (low), unknown EOAs (medium), mixers/sanctions (high)?
- regulatory_risk: Would this activity trigger regulatory reporting requirements?

Be specific. Reference actual data. If data is limited, mark low risk with brief justification."""),
    ("user", """Subject: {address}
Currency: {currency}

Transaction Summary:
- Total transactions: {tx_count}
- Total received: {total_received} {currency}
- Total sent: {total_sent} {currency}
- Unique counterparties: {counterparties}
- Max single tx: {max_tx_value} {currency}

Fund Flow Graph (nodes + edges, depth {trace_depth}):
{flow_graph}

Address Labels:
{labels}

Sample transactions:
{sample_txs}

Rule Engine Triggers:
{rule_triggers}"""),
])

# 行为基线分析 Prompt
BEHAVIOR_BASELINE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """Analyze the behavioral baseline and detect anomalies.

Respond with JSON:
{{
  "is_anomalous": <true|false>,
  "anomalies": [
    {{ "metric": "<name>", "baseline_value": <number>, "current_value": <number>, "sigma_deviation": <number>, "interpretation": "<why this matters>" }}
  ],
  "baseline_summary": "<description of normal behavior>",
  "anomaly_summary": "<if anomalous, explain the pattern>"
}}"""),
    ("user", """Address: {address}
Baseline period: {baseline_days} days
Recent period: {recent_days} days

Baseline stats:
- Avg daily transactions: {baseline_tx_count}
- Avg daily volume ({currency}): {baseline_volume}
- Avg unique counterparties/day: {baseline_cp}

Recent stats:
- Avg daily transactions: {recent_tx_count}
- Avg daily volume ({currency}): {recent_volume}
- Avg unique counterparties/day: {recent_cp}
- New counterparties this period: {new_cp_count}
"""),
])
