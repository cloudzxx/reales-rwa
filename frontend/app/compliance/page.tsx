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
        <h1 className="text-xl font-semibold text-white">AI Compliance Analysis</h1>
        <p className="text-sm text-white/40 mt-1">On-chain behavior analysis with AI-powered risk scoring</p>
      </div>

      <form onSubmit={handleAnalyze} className="flex gap-2 mb-6 max-w-xl">
        <input
          type="text"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="Enter wallet address to analyze"
          className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition font-mono text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-white/[0.08] disabled:to-white/[0.08] disabled:text-white/20 text-white font-medium rounded-xl px-6 py-2.5 transition-all"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm mb-6">{error}</div>
      )}

      {report && (
        <div className="space-y-5">
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <p className="text-xs text-white/30 uppercase tracking-wider">Risk Score</p>
              <div className="flex items-center gap-3">
                <div className="w-40 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${getScoreBg(report.risk_score)}`}
                    style={{ width: `${report.risk_score}%` }} />
                </div>
                <span className={`text-2xl font-bold ${getScoreColor(report.risk_score)}`}>{report.risk_score}</span>
                <span className="text-sm text-white/30">/100</span>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6">
            <h3 className="text-xs text-white/30 uppercase tracking-wider mb-2">Behavior Profile</h3>
            <p className="text-white/80">{report.behavior_profile}</p>
          </div>

          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6">
            <h3 className="text-xs text-white/30 uppercase tracking-wider mb-2">AI Summary</h3>
            <p className="text-white/60 leading-relaxed text-sm">{report.summary}</p>
          </div>

          {report.unusual_tx.length > 0 && (
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6">
              <h3 className="text-xs text-white/30 uppercase tracking-wider mb-3">
                Unusual Transactions <span className="text-yellow-400/60">({report.unusual_tx.length})</span>
              </h3>
              <div className="space-y-2">
                {report.unusual_tx.map((tx, i) => (
                  <div key={tx + i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-2.5 font-mono text-xs text-yellow-400/70 break-all">
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
