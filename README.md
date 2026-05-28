# Reales RWA — 双链 RWA 代币化合规分析平台

双链（EVM + Solana）RWA 代币发行平台，集成 AI 驱动的 6 层合规检测管道，将 RWA 从开放代币转账升级为带监管级风控的合规代币平台。

## 架构总览

```
┌──────────────────────────────────────────────────────────────┐
│                    frontend (Next.js 14)                      │
│  RainbowKit + wagmi (EVM) / @solana/web3.js (Solana)          │
│  合规页面：风险评分 → 4 维 → 资金流图 → 审计日志 → 摘要     │
└──────────────────────────┬───────────────────────────────────┘
                           │ POST /api/compliance/report
┌──────────────────────────▼───────────────────────────────────┐
│                 ai-agent (Python FastAPI)                      │
│                                                               │
│   ┌────────── 6 层合规检测管道 ────────────┐                 │
│   │ 1. fetcher (EVM / Solana 链上数据)     │                 │
│   │ 2. analyzer/fund_flow (资金流向图)     │                 │
│   │ 3. analyzer/profiler (地址画像)        │                 │
│   │ 4. rules.py (规则引擎)                 │                 │
│   │ 5. analyzer/risk (四维风险评分)        │                 │
│   │ 6. LLM (MiniMax M2.7 叙事分析)        │                 │
│   └────────────────────────────────────────┘                 │
│                                                               │
│   LLM 不可用时自动降级到规则引擎，确保永不断服                │
└──────────────────────────┬───────────────────────────────────┘
                           │ RPC
┌──────────────────────────▼───────────────────────────────────┐
│  hardhat (EVM)              solana-validator (Solana)         │
│  RWAToken.sol                reales-rwa-solana (Anchor Rust)  │
│  ERC20 + whitelist + freeze  SPL Token + PDA whitelist       │
│  25 unit tests               TypeScript tests                 │
└──────────────────────────────────────────────────────────────┘
```

## 合规检测 6 层管道

每笔 RWA 交易经过 6 层自动化分析，全程可追溯：

### 第 1 层：数据获取

| 检测逻辑 | EVM | Solana |
|----------|-----|--------|
| 事件类型 | `Transfer` 事件签名过滤 | SPL Token `preTokenBalances`/`postBalances` 差分 |
| 分片策略 | 每 200 块一分片，默认回溯 50000 块 | 最新 100 笔签名 |
| 去重 | 按 `transactionHash` 去重 | 交易级去重 |
| 容错 | 单分片失败跳过不中断 | 单交易失败跳过不中断 |

### 第 2 层：资金流向追踪

- 跨链通用图构建：输入交易 → `{nodes, edges, total_sent, total_received}`
- 节点聚合：同一地址合并为单一节点，累加金额和交易数
- 流量排序裁剪：取 Top 50 节点
- EVM 递归追溯：BFS 向上追溯对手方，默认 2 层，循环防止

### 第 3 层：地址画像

已知地址数据库（`config.py`）：

| 分类 | 数量 | 来源 |
|------|------|------|
| 交易所 (EVM) | 8 | Binance, Coinbase, OKX, Bybit, Kraken, KuCoin |
| 交易所 (Solana) | 2 | Binance SOL, Coinbase SOL |
| 混币器 (EVM) | 5 | Tornado Cash 各面额池 + 治理地址 |
| 混币器 (Solana) | 1 | anonymous.zk |
| 跨链桥 | 3 | Wormhole, LayerZero, Celer |
| 制裁地址 (OFAC) | 3 | Tornado Cash + Blender.io |

地址分类：exchange / mixer / bridge / sanctioned / burn_address / likely_eoa / unknown

### 第 4 层：规则引擎（4 条检测规则）

所有阈值可通过环境变量覆盖：

| 规则 | 触发条件 | 风险 | 默认阈值 | 动作 |
|------|----------|------|----------|------|
| **mixer_interaction** | 交易对手匹配混币器 | high | — | freeze |
| **large_value_transfer** | 单笔 > 阈值 | medium | 1000 ETH | trigger_agent_review |
| **high_frequency_trading** | 交易数 > 阈值 | low | 50 笔/天 | tag_for_monitoring |
| **sanctioned_address** | 与制裁地址交互 | critical | — | freeze_and_report |

### 第 5 层：四维风险评分

| 维度 | 权重 | 评分方法 |
|------|------|----------|
| counterparty_risk | 10% | 混币器/制裁地址 → 1.0；交易所 → 0.3 |
| flow_complexity | 40% | 边/节点比：>3→0.9, >2→0.6, >1→0.3 |
| anomaly_score | 35% | 交易量 + 出入金失衡度分段评分 |
| behavior_consistency | 15% | 基线数据缺失，默认 0.0 |

总分 = 线性加权，风险等级：≥70 high / ≥40 medium / <40 low

### 第 6 层：LLM 叙事分析（MiniMax M2.7）

System Prompt 框架：

```
You are a senior blockchain compliance analyst. Analyze the subject address
and produce a detailed, structured risk report.

Risk analysis framework:
- fund_source_risk: Are funds from known exchanges (low),
  unknown wallets (medium), or mixers (high)?
- behavior_risk: Is the transaction pattern normal or suspicious?
- counterparty_risk: Who are the counterparties?
- regulatory_risk: Would this trigger regulatory reporting?
```

User Prompt 传入变量：`{address, currency, tx_count, total_received, total_sent, counterparties, max_tx_value, flow_graph, labels, sample_txs, rule_triggers, trace_depth}`

LLM 不可用时自动降级到规则引擎评分，确保服务不间断。

## RWA 应用流程变化

合规检测把 RWA 从一个开放的代币转账系统变成了带监管级风控的合规代币平台——每笔交易都有自动化风险评估、可审计轨迹、和可读性分析报告。

| 阶段 | 之前（无合规） | 之后（有 6 层管道） |
|------|---------------|-------------------|
| **发行前** | 设定合约参数 | 设定合规策略：白名单 + 规则阈值 + 自动冻结 |
| **申购** | 用户直接转账 | 申购前调合规 API → 高风险地址冻结/拒绝准入 |
| **二级转账** | 白名单地址互转 | 实时规则 + LLM 分析，自动拦截混币器/制裁交互 |
| **分红/回购** | 批量转账 | 自动识别异常收款地址，触发人工审核 |
| **审计/监管** | 手动查区块浏览器 | 一键生成 `case_id` 报告（资金流图 + 4 维评分 + audit_trail） |

### 能力矩阵

| 能力 | 效果 |
|------|------|
| **自动拦截** | 混币器/制裁地址交互 → 冻结 + 报告 |
| **风险评级** | 每地址/每交易 0-100 评分，支持分级 KYC |
| **合规追溯** | 50000 块交易历史，递归 2 层对手方，完整 audit_trail |
| **AI 叙事** | 非技术人员可读的合规报告 |
| **监管准备** | `case_id` + `generated_at` + `version` + `audit_trail` 符合金融监管格式 |

### 真实场景示例

> **一个 RWA 房地产代币，用户要申购 5000 USDC 份额**
>
> - **无合规**：合约检查白名单 → 通过 → 转账完成
> - **有合规**：查到该地址 24 小时前从 Tornado Cash 收到资金，规则引擎标记 `mixer_interaction(high)→freeze`，交易被冻结，合规官收到含完整审计链路的报告

## 输出报告结构

```json
{
  "case_id": "RWA-COMP-20260528-ABCDEF",
  "subject": { "address": "0x...", "chain": "ethereum" },
  "risk_assessment": {
    "overall_score": 75,
    "level": "high",
    "dimensions": {
      "counterparty_risk": 100,
      "flow_complexity": 60,
      "anomaly_score": 80,
      "behavior_consistency": 0
    }
  },
  "fund_flow": {
    "nodes": [{ "address", "label", "type", "flow_in", "flow_out" }],
    "edges": [{ "from", "to", "value", "tx_hash" }]
  },
  "recommendation": { "action": "freeze", "notes": "..." },
  "audit_trail": [
    { "stage": "fetcher", "status": "ok", "detail": "25 txs found" },
    { "stage": "fund_flow", "status": "ok", "detail": "12 nodes depth=2" },
    { "stage": "rule_engine", "status": "ok", "detail": "Triggered: 2 rules" },
    { "stage": "llm_analysis", "status": "ok", "detail": "LLM in 18.5s in=450 out=120" }
  ],
  "summary": "..."
}
```

## 部署

```bash
# 启动所有服务
docker compose up -d

# 部署合约
docker compose run --rm deploy

# 重启前端（hardhat 重启后需执行）
docker compose restart frontend

# 打包部署到云服务器
bash scripts/package.sh
```

## 开发环境

```bash
# 本地启动（不依赖 Docker）
pnpm install
pnpm dev  # frontend:3000 + ai-agent:8000
```

环境变量配置见 `.env.example`。

## 已知局限

| 能力 | 当前实现 | 真实合规系统 |
|------|----------|-------------|
| 地址覆盖 | 18 个已知地址 | Chainalysis / TRM Labs（数亿地址） |
| 图分析 | Python dict | Neo4j / TigerGraph |
| 规则引擎 | 4 条硬编码热更新规则 | Actimize / Fircosoft（可编排） |
| 风险评分 | 4 维线性加权 | 200+ 维 XGBoost/LightGBM |
| 行为基线 | 固定阈值 | 滑动窗口 z-score / Isolation Forest |
| 跨链追踪 | 无 | Wormhole / CCTP 日志关联 |
| 地址聚类 | 无 | Chainalysis Cluster 团伙归并 |
| 制裁更新 | 3 硬编码地址 | OFAC SDN 实时推送 |
