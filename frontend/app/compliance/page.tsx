"use client";

import { useState } from "react";

interface ComplianceReport {
  risk_score: number;
  behavior_profile: string;
  unusual_tx: string[];
  summary: string;
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

export default function CompliancePage() {
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
        body: JSON.stringify({ address: addr }),
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
      <h1 className="text-xl font-semibold text-gray-900 mb-1">AI Compliance Analysis</h1>
      <p className="text-sm text-gray-500 mb-6">
        Analyze on-chain behavior and generate a risk report for any address.
      </p>

      <form onSubmit={handleAnalyze} className="max-w-lg flex gap-2 mb-6">
        <input
          type="text"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="Enter wallet address to analyze"
          className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg px-6 py-2.5 transition"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 mb-6">{error}</div>
      )}

      {report && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200/80 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Risk Score</p>
              <div className="flex items-center gap-2">
                <div className="w-36 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getScoreBg(report.risk_score)} rounded-full transition-all`}
                    style={{ width: `${report.risk_score}%` }}
                  />
                </div>
                <span className={`text-2xl font-bold ${getScoreColor(report.risk_score)}`}>
                  {report.risk_score}
                </span>
                <span className="text-sm text-gray-400">/100</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200/80 rounded-xl p-6 shadow-sm">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Behavior Profile</h3>
            <p className="text-gray-800">{report.behavior_profile}</p>
          </div>

          <div className="bg-white border border-gray-200/80 rounded-xl p-6 shadow-sm">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">AI Summary</h3>
            <p className="text-gray-600 leading-relaxed">{report.summary}</p>
          </div>

          {report.unusual_tx.length > 0 && (
            <div className="bg-white border border-gray-200/80 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3">
                Unusual Transactions ({report.unusual_tx.length})
              </h3>
              <div className="space-y-2">
                {report.unusual_tx.map((tx, i) => (
                  <div key={tx + i} className="bg-gray-50 rounded-lg px-3 py-2 font-mono text-xs text-yellow-700 break-all border border-gray-200/60">
                    {tx}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
