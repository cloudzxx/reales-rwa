"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useChain } from "@/lib/chain-context";

interface RiskDimension {
  score: number;
  level: string;
  detail: string;
}

interface FlowNode {
  address: string;
  label: string | null;
  type: string;
  flow_in: number;
  flow_out: number;
  depth: number;
}

interface FlowEdge {
  from: string;
  to: string;
  value: number;
  tx_hash: string;
}

interface FundFlow {
  total_sent?: number;
  total_received?: number;
  max_depth?: number;
  top_counterparties?: Array<{ address: string; sent?: number; received?: number }>;
  flow_summary?: string;
  nodes?: FlowNode[];
  edges?: FlowEdge[];
}

interface StructuredReport {
  overview: string;
  fund_flow_analysis: string;
  risk_assessment: string;
  recommendations: string;
}

interface AuditStep {
  stage: string;
  status: string;
  detail: string;
}

interface ComplianceReport {
  // New format from structured report generator
  risk_assessment?: { overall_score: number; level: string; dimensions?: Record<string, RiskDimension> };
  risk_score?: number;  // backward compat
  risk_level?: string;  // backward compat
  risk_dimensions?: Record<string, RiskDimension>;
  fund_flow?: FundFlow;
  structured_report?: StructuredReport;
  unusual_tx: string[];
  summary: string;
  recommended_action?: string;
  recommendation?: { action: string; notes: string };
  triggers?: Array<{ rule: string; risk: string; detail: string }>;
  audit_trail?: AuditStep[];
}

function dimScoreBar(score: number) {
  const color = score >= 70 ? "bg-red-500" : score >= 40 ? "bg-yellow-500" : "bg-green-500";
  return <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex-1 min-w-[60px]">
    <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
  </div>;
}

function dimLevelBadge(level: string) {
  const map: Record<string, string> = {
    low: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700", critical: "bg-red-200 text-red-800",
  };
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${map[level] || map.medium}`}>{level}</span>;
}

function actionBadge(action: string) {
  const map: Record<string, string> = {
    pass: "bg-green-100 text-green-700 border-green-200",
    monitor: "bg-blue-100 text-blue-700 border-blue-200",
    review: "bg-yellow-100 text-yellow-700 border-yellow-200",
    freeze: "bg-red-100 text-red-700 border-red-200",
  };
  return <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${map[action] || map.monitor}`}>{action?.toUpperCase()}</span>;
}

function nodeTypeColor(type: string) {
  const m: Record<string, string> = { exchange: "text-orange-500", mixer: "text-red-500", bridge: "text-purple-500", unknown: "text-gray-400" };
  return m[type] || "text-gray-400";
}

export default function CompliancePage() {
  const { t } = useI18n();
  const { chain } = useChain();
  const [addr, setAddr] = useState("");
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useExternal, setUseExternal] = useState(false);
  const [extRpc, setExtRpc] = useState("");
  const [extContract, setExtContract] = useState("");

  // 统一提取风险评分
  const riskScore = report?.risk_assessment?.overall_score ?? report?.risk_score ?? 0;
  const riskLevel = report?.risk_assessment?.level ?? report?.risk_level ?? "low";
  const dims = report?.risk_assessment?.dimensions ?? report?.risk_dimensions ?? {};

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!addr) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const body: any = { address: addr, chain };
      if (useExternal) {
        if (extRpc) body.rpc_url = extRpc;
        if (extContract) body.contract_address = extContract;
      }
      const res = await fetch("/api/compliance/report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("compliance.title")}</h1>
        <p className="text-lg text-gray-500 mt-1">{t("compliance.subtitle")}</p>
      </div>
      <form onSubmit={handleAnalyze} className="flex gap-3 mb-4 max-w-2xl">
        <input type="text" value={addr} onChange={e => setAddr(e.target.value)} placeholder={t("compliance.placeholder")}
          className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition font-mono" />
        <button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:bg-gray-300 text-white font-semibold rounded-xl px-8 py-3 text-lg transition-all">
          {loading ? t("compliance.analyzing") : t("compliance.analyze")}
        </button>
      </form>

      {/* Network Switch */}
      <div className="flex items-center gap-4 mb-6 text-sm">
        <button onClick={() => setUseExternal(false)} className={`px-3 py-1.5 rounded-lg transition ${!useExternal ? "bg-blue-100 text-blue-700 font-medium" : "bg-gray-100 text-gray-500"}`}>Local Network</button>
        <button onClick={() => setUseExternal(true)} className={`px-3 py-1.5 rounded-lg transition ${useExternal ? "bg-blue-100 text-blue-700 font-medium" : "bg-gray-100 text-gray-500"}`}>External RPC</button>
        {useExternal && (
          <div className="flex gap-2 flex-1">
            <input type="text" value={extRpc} onChange={e => setExtRpc(e.target.value)} placeholder="RPC URL (https://...)" className="flex-1 px-2 py-1 text-xs border rounded" />
            <input type="text" value={extContract} onChange={e => setExtContract(e.target.value)} placeholder="Contract address" className="flex-1 px-2 py-1 text-xs border rounded font-mono" />
          </div>
        )}
      </div>
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-600 text-lg mb-6">{error}</div>}

      {report && (
        <div className="space-y-5">
          {/* 风险评分 + 行动建议 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div><p className="text-sm text-gray-400 mb-1">{t("compliance.riskScore")}</p>
                  <span className="text-3xl font-bold">{riskScore}</span>
                  <span className="text-lg text-gray-400">/100</span>
                </div>
                <div className="w-36 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div                   className={`h-full rounded-full ${riskScore >= 70 ? "bg-red-500" : riskScore >= 40 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${riskScore}%` }} />
                </div>
                <span className="text-sm uppercase font-bold text-gray-500">{riskLevel}</span>
              </div>
              {report.recommendation?.action ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Recommended:</span>
                  {actionBadge(report.recommendation.action || report.recommended_action || "monitor")}
                </div>
              ) : report.recommended_action ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Recommended:</span>
                  {actionBadge(report.recommended_action)}
                </div>
              ) : null}
            </div>
          </div>

          {/* 四维风险评分 */}
          {Object.keys(dims).length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Multi-Dimension Risk Assessment</h3>
              <div className="space-y-3">
                {Object.entries(dims).map(([key, dim]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-36 text-sm font-medium text-gray-700">
                      {key === "fund_source_risk" ? "Fund Source" : key === "behavior_risk" ? "Behavior" : key === "counterparty_risk" ? "Counterparty" : "Regulatory"}
                    </span>
                    {dimScoreBar(dim.score)}
                    <span className="w-8 text-sm font-bold text-gray-800 text-right">{dim.score}</span>
                    {dimLevelBadge(dim.level)}
                    <span className="text-xs text-gray-400 flex-1 truncate">{dim.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 结构化报告 */}
          {report.structured_report && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ["Overview", report.structured_report.overview],
                ["Fund Flow Analysis", report.structured_report.fund_flow_analysis],
                ["Risk Assessment", report.structured_report.risk_assessment],
                ["Recommendations", report.structured_report.recommendations],
              ].map(([title, content]) => (
                <div key={title} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</h3>
                  <p className="text-base text-gray-800">{content}</p>
                </div>
              ))}
            </div>
          )}

          {/* 资金流向图 */}
          {report.fund_flow && ((report.fund_flow.nodes && report.fund_flow.nodes.length > 0) || (report.fund_flow.total_sent !== undefined)) && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Fund Flow Graph <span className="text-gray-300">(depth {report.fund_flow.max_depth || 1})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {report.fund_flow.total_sent !== undefined && (
                  <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs text-gray-400">Total Sent</p><p className="text-xl font-semibold text-red-600">{report.fund_flow.total_sent}</p></div>
                )}
                {report.fund_flow.total_received !== undefined && (
                  <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs text-gray-400">Total Received</p><p className="text-xl font-semibold text-green-600">{report.fund_flow.total_received}</p></div>
                )}
                <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs text-gray-400">Nodes / Edges</p><p className="text-xl font-semibold text-gray-800">{(report.fund_flow.nodes?.length || 0)} / {(report.fund_flow.edges?.length || 0)}</p></div>
              </div>
              {/* Nodes */}
              {report.fund_flow.nodes && report.fund_flow.nodes.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs text-gray-400 mb-2">Nodes</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-gray-100 text-gray-400"><th className="text-left py-1.5">Address</th><th className="text-left py-1.5">Type</th><th className="text-right py-1.5">In</th><th className="text-right py-1.5">Out</th></tr></thead>
                      <tbody>
                        {report.fund_flow.nodes.map((n, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-1.5 font-mono text-gray-600">{n.address?.slice(0, 16)}...{n.depth !== undefined ? ` [d${n.depth}]` : ""}</td>
                            <td className={`py-1.5 ${nodeTypeColor(n.type)}`}>{n.type}{n.label ? ` (${n.label})` : ""}</td>
                            <td className="py-1.5 text-right text-green-600">{n.flow_in}</td>
                            <td className="py-1.5 text-right text-red-600">{n.flow_out}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Edges */}
              {report.fund_flow.edges && report.fund_flow.edges.length > 0 && report.fund_flow.edges.length <= 30 && (
                <div>
                  <h4 className="text-xs text-gray-400 mb-2">Edges</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {report.fund_flow.edges.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] font-mono text-gray-500">
                        <span>{e.from?.slice(0, 10)}..</span>
                        <span className="text-gray-300">→</span>
                        <span>{e.to?.slice(0, 10)}..</span>
                        <span className="text-gray-800 font-medium ml-auto">{e.value?.toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 审计轨迹 */}
          {report.audit_trail && report.audit_trail.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Audit Trail</h3>
              <div className="space-y-2">
                {report.audit_trail.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className={`w-2 h-2 rounded-full ${step.status === "ok" ? "bg-green-400" : step.status === "no_data" ? "bg-yellow-400" : "bg-red-400"}`} />
                    <span className="w-24 font-mono text-xs text-gray-400">{step.stage}</span>
                    <span className="text-gray-600">{step.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 异常交易 */}
          {report.unusual_tx.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{t("compliance.unusualTxs")} <span className="text-yellow-600">({report.unusual_tx.length})</span></h3>
              <div className="space-y-2">
                {report.unusual_tx.map((tx, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-sm text-yellow-700 break-all">{tx}</div>
                ))}
              </div>
            </div>
          )}

          {/* AI 总结 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("compliance.summary")}</h3>
            <p className="text-lg text-gray-600 leading-relaxed">{report.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}
