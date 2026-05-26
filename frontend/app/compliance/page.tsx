"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useChain } from "@/lib/chain-context";

interface RiskDimension { score: number; level: string; detail: string; }
interface AuditStep { stage: string; status: string; detail: string; }

interface ComplianceReport {
  risk_assessment?: { overall_score: number; level: string; dimensions?: Record<string, RiskDimension> };
  risk_score?: number; risk_level?: string;
  risk_dimensions?: Record<string, RiskDimension>;
  fund_flow?: any; structured_report?: any; unusual_tx: string[]; summary: string;
  recommended_action?: string; recommendation?: { action: string; notes: string };
  audit_trail?: AuditStep[];
}

export default function CompliancePage() {
  const { t } = useI18n(); const { chain } = useChain();
  const [addr, setAddr] = useState(""); const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const [useExternal, setUseExternal] = useState(false);
  const [extRpc, setExtRpc] = useState(""); const [extContract, setExtContract] = useState("");

  const riskScore = (report?.risk_assessment?.overall_score || report?.risk_score || 0) as number;
  const riskLevel = report?.risk_assessment?.level || report?.risk_level || "low";
  const dims = report?.risk_assessment?.dimensions || report?.risk_dimensions || {};
  const action = report?.recommendation?.action || report?.recommended_action || "monitor";

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault(); if (!addr) return;
    setLoading(true); setError(null); setReport(null);
    try {
      const body: any = { address: addr, chain };
      if (useExternal) { if (extRpc) body.rpc_url = extRpc; if (extContract) body.contract_address = extContract; }
      const res = await fetch("/api/compliance/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error); setReport(data);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900">{t("compliance.title")}</h1><p className="text-lg text-gray-500 mt-1">{t("compliance.subtitle")}</p></div>
      <form onSubmit={handleAnalyze} className="flex gap-3 mb-4 max-w-2xl">
        <input type="text" value={addr} onChange={e => setAddr(e.target.value)} placeholder={t("compliance.placeholder")} className="flex-1 border rounded-xl px-4 py-3 text-lg font-mono focus:ring-2 focus:ring-blue-500/30" />
        <button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl px-8 py-3 text-lg">{loading ? t("compliance.analyzing") : t("compliance.analyze")}</button>
      </form>

      <div className="flex gap-3 mb-6 text-sm">
        <button onClick={() => setUseExternal(false)} className={`px-3 py-1.5 rounded-lg ${!useExternal ? "bg-blue-100 text-blue-700" : "bg-gray-100"}`}>Local</button>
        <button onClick={() => setUseExternal(true)} className={`px-3 py-1.5 rounded-lg ${useExternal ? "bg-blue-100 text-blue-700" : "bg-gray-100"}`}>External RPC</button>
        {useExternal && <><input type="text" value={extRpc} onChange={e => setExtRpc(e.target.value)} placeholder="RPC URL" className="flex-1 px-2 py-1 text-xs border rounded" /><input type="text" value={extContract} onChange={e => setExtContract(e.target.value)} placeholder="Contract" className="flex-1 px-2 py-1 text-xs border rounded font-mono" /></>}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-600 mb-6">{error}</div>}

      {report && (
        <div className="space-y-5">
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold">{riskScore}</span><span className="text-gray-400">/100</span>
                <div className="w-36 h-3 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${riskScore >= 70 ? "bg-red-500" : riskScore >= 40 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${riskScore}%` }} /></div>
                <span className="uppercase font-bold text-gray-500">{riskLevel}</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${action === "freeze" ? "bg-red-100 border-red-200 text-red-700" : action === "review" ? "bg-yellow-100 border-yellow-200 text-yellow-700" : "bg-blue-100 border-blue-200 text-blue-700"}`}>{action.toUpperCase()}</span>
            </div>
          </div>

          {Object.keys(dims).length > 0 && (
            <div className="bg-white border rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Multi-Dimension Risk</h3>
              {Object.entries(dims).map(([k, d]) => (
                <div key={k} className="flex items-center gap-3 mb-2">
                  <span className="w-32 text-sm">{k}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full"><div className={`h-full rounded-full ${d.score >= 70 ? "bg-red-500" : d.score >= 40 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${d.score}%` }} /></div>
                  <span className="w-8 text-sm font-bold text-right">{d.score}</span>
                  <span className="text-xs text-gray-400">{d.detail}</span>
                </div>
              ))}
            </div>
          )}

          {report.structured_report && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["overview","fund_flow_analysis","risk_assessment","recommendations"] as const).map(k => (
                <div key={k} className="bg-white border rounded-2xl p-6 shadow-sm"><h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">{k.replace(/_/g," ")}</h3><p className="text-base text-gray-800">{report.structured_report[k]}</p></div>
              ))}
            </div>
          )}

          {report.fund_flow && (report.fund_flow.total_sent !== undefined || report.fund_flow.total_received !== undefined) && (
            <div className="bg-white border rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Fund Flow (depth {report.fund_flow.max_depth || 1})</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs text-gray-400">Sent</p><p className="text-xl font-semibold text-red-600">{report.fund_flow.total_sent ?? 0}</p></div>
                <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs text-gray-400">Received</p><p className="text-xl font-semibold text-green-600">{report.fund_flow.total_received ?? 0}</p></div>
                <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs text-gray-400">Nodes/Edges</p><p className="text-xl font-semibold">{(report.fund_flow.nodes?.length || 0)}/{(report.fund_flow.edges?.length || 0)}</p></div>
              </div>
            </div>
          )}

          {report.audit_trail && report.audit_trail.length > 0 && (
            <div className="bg-white border rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Audit Trail</h3>
              {report.audit_trail.map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-sm mb-1">
                  <span className={`w-2 h-2 rounded-full ${s.status === "ok" ? "bg-green-400" : "bg-yellow-400"}`} />
                  <span className="w-24 font-mono text-xs text-gray-400">{s.stage}</span>
                  <span className="text-gray-600">{s.detail}</span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">{t("compliance.summary")}</h3>
            <p className="text-lg text-gray-600">{report.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}
