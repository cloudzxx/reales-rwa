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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Compliance Analysis</h1>
        <p className="text-lg text-gray-500 mt-1">On-chain behavior analysis with AI-powered risk scoring</p>
      </div>

      <form onSubmit={handleAnalyze} className="flex gap-3 mb-6 max-w-2xl">
        <input
          type="text"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="Enter wallet address to analyze"
          className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition font-mono"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold rounded-xl px-8 py-3 text-lg transition-all"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-600 text-lg mb-6">{error}</div>
      )}

      {report && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-5">
              <p className="text-base text-gray-400 font-medium">Risk Score</p>
              <div className="flex items-center gap-3">
                <div className="w-48 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${getScoreBg(report.risk_score)}`}
                    style={{ width: `${report.risk_score}%` }} />
                </div>
                <span className={`text-3xl font-bold ${getScoreColor(report.risk_score)}`}>{report.risk_score}</span>
                <span className="text-lg text-gray-400">/100</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base text-gray-400 font-medium mb-2">Behavior Profile</h3>
            <p className="text-xl text-gray-800">{report.behavior_profile}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base text-gray-400 font-medium mb-2">AI Summary</h3>
            <p className="text-lg text-gray-600 leading-relaxed">{report.summary}</p>
          </div>

          {report.unusual_tx.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base text-gray-400 font-medium mb-3">
                Unusual Transactions <span className="text-yellow-600">({report.unusual_tx.length})</span>
              </h3>
              <div className="space-y-2">
                {report.unusual_tx.map((tx, i) => (
                  <div key={tx + i} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-base text-yellow-700 break-all">
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
