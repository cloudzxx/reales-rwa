"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useChain } from "@/lib/chain-context";

interface Counterparty {
  address: string;
  sent?: number;
  received?: number;
}

interface FundFlow {
  total_sent?: number;
  total_received?: number;
  top_counterparties?: Counterparty[];
  flow_summary?: string;
}

interface StructuredReport {
  overview: string;
  fund_flow_analysis: string;
  risk_assessment: string;
  recommendations: string;
}

interface ComplianceReport {
  risk_score: number;
  risk_level: string;
  behavior_profile: string;
  fund_flow?: FundFlow;
  structured_report?: StructuredReport;
  unusual_tx: string[];
  summary: string;
  analyzed_transactions?: Array<{
    hash: string;
    from: string;
    to: string;
    value: number;
    blockNumber: number;
  }>;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-red-600";
  if (score >= 40) return "text-yellow-600";
  return "text-green-600";
}

function getScoreBg(score: number): string {
  if (score >= 70) return "bg-red-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-green-500";
}

function getLevelBadge(level: string) {
  const map: Record<string, string> = {
    low: "bg-green-100 text-green-700 border-green-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    high: "bg-red-100 text-red-700 border-red-200",
    critical: "bg-red-200 text-red-800 border-red-300",
  };
  return map[level] || map.medium;
}

export default function CompliancePage() {
  const { t } = useI18n();
  const { chain } = useChain();
  const [addr, setAddr] = useState("");
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!addr) return;
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/compliance/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, chain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("compliance.title")}</h1>
        <p className="text-lg text-gray-500 mt-1">{t("compliance.subtitle")}</p>
      </div>

      <form onSubmit={handleAnalyze} className="flex gap-3 mb-6 max-w-2xl">
        <input
          type="text"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder={t("compliance.placeholder")}
          className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition font-mono"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold rounded-xl px-8 py-3 text-lg transition-all"
        >
          {loading ? t("compliance.analyzing") : t("compliance.analyze")}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-600 text-lg mb-6">{error}</div>
      )}

      {report && (
        <div className="space-y-5">
          {/* 风险评分 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <p className="text-base text-gray-400 font-medium">{t("compliance.riskScore")}</p>
                <div className="flex items-center gap-3">
                  <div className="w-48 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${getScoreBg(report.risk_score)}`}
                      style={{ width: `${report.risk_score}%` }} />
                  </div>
                  <span className={`text-3xl font-bold ${getScoreColor(report.risk_score)}`}>{report.risk_score}</span>
                  <span className="text-lg text-gray-400">/100</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getLevelBadge(report.risk_level)}`}>
                {report.risk_level.toUpperCase()}
              </span>
            </div>
          </div>

          {/* 结构化报告 */}
          {report.structured_report && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Overview</h3>
                <p className="text-base text-gray-800">{report.structured_report.overview}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Fund Flow Analysis</h3>
                <p className="text-base text-gray-800">{report.structured_report.fund_flow_analysis}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Risk Assessment</h3>
                <p className="text-base text-gray-800">{report.structured_report.risk_assessment}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Recommendations</h3>
                <p className="text-base text-gray-800">{report.structured_report.recommendations}</p>
              </div>
            </div>
          )}

          {/* 资金流向 */}
          {report.fund_flow && (report.fund_flow.total_sent !== undefined || report.fund_flow.total_received !== undefined) && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Fund Flow Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {report.fund_flow.total_sent !== undefined && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-400">Total Sent</p>
                    <p className="text-2xl font-semibold text-red-600">{report.fund_flow.total_sent} ETH</p>
                  </div>
                )}
                {report.fund_flow.total_received !== undefined && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-400">Total Received</p>
                    <p className="text-2xl font-semibold text-green-600">{report.fund_flow.total_received} ETH</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-400">Flow Summary</p>
                  <p className="text-lg text-gray-700">{report.fund_flow.flow_summary}</p>
                </div>
              </div>
              {report.fund_flow.top_counterparties && report.fund_flow.top_counterparties.length > 0 && (
                <div className="overflow-x-auto">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Top Counterparties</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400">
                        <th className="text-left py-2">Address</th>
                        <th className="text-right py-2">Sent</th>
                        <th className="text-right py-2">Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.fund_flow.top_counterparties.map((cp, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-2 font-mono text-xs text-gray-600">{cp.address?.slice(0, 16)}...</td>
                          <td className="py-2 text-right text-red-500">{(cp as any).sent !== undefined ? `${(cp as any).sent} ETH` : "-"}</td>
                          <td className="py-2 text-right text-green-500">{(cp as any).received !== undefined ? `${(cp as any).received} ETH` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 异常交易 */}
          {report.unusual_tx.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {t("compliance.unusualTxs")} <span className="text-yellow-600">({report.unusual_tx.length})</span>
              </h3>
              <div className="space-y-2">
                {report.unusual_tx.map((tx, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-base text-yellow-700 break-all">
                    {tx}
                  </div>
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
