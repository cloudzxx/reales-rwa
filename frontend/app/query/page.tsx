"use client";

import { useState } from "react";

interface Transfer {
  from: string;
  to: string;
  value: string;
  hash: string;
  blockNumber: number;
}

interface AddressData {
  address: string;
  balance: string;
  isWhitelisted: boolean;
  isFrozen: boolean;
  transfers: Transfer[];
}

export default function QueryPage() {
  const [searchAddr, setSearchAddr] = useState("");
  const [data, setData] = useState<AddressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchAddr) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/token/${searchAddr}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Address Query</h1>
        <p className="text-sm text-white/40 mt-1">Look up balance, status, and transaction history</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-xl">
        <input
          type="text"
          value={searchAddr}
          onChange={(e) => setSearchAddr(e.target.value)}
          placeholder="Enter wallet address (0x...)"
          className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition font-mono text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-white/[0.08] disabled:to-white/[0.08] disabled:text-white/20 text-white font-medium rounded-xl px-6 py-2.5 transition-all"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm mb-6">{error}</div>
      )}

      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/[0.08] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-5">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Balance</p>
              <p className="text-xl font-semibold text-white">{Number(data.balance).toLocaleString()}</p>
            </div>
            <div className="bg-white/[0.08] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-5">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Whitelist</p>
              <p className={`text-lg font-semibold ${data.isWhitelisted ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.isWhitelisted ? "Whitelisted" : "Not Whitelisted"}
              </p>
            </div>
            <div className="bg-white/[0.08] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-5">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Status</p>
              <p className={`text-lg font-semibold ${data.isFrozen ? 'text-red-400' : 'text-emerald-400'}`}>
                {data.isFrozen ? "Frozen" : "Active"}
              </p>
            </div>
          </div>

          <div className="bg-white/[0.08] backdrop-blur-xl border border-white/[0.1] rounded-2xl overflow-hidden">
            <h2 className="text-sm font-medium text-white/70 p-5 border-b border-white/[0.06]">
              Transfer History <span className="text-white/30">({data.transfers.length})</span>
            </h2>
            {data.transfers.length === 0 ? (
              <p className="p-5 text-white/20 text-sm">No transfers found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-white/30 text-xs">
                      <th className="text-left p-3 font-medium">From</th>
                      <th className="text-left p-3 font-medium">To</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transfers.map((tx, i) => (
                      <tr key={tx.hash + i} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                        <td className="p-3 font-mono text-xs text-white/50">{tx.from.slice(0, 10)}...</td>
                        <td className="p-3 font-mono text-xs text-white/50">{tx.to.slice(0, 10)}...</td>
                        <td className="p-3 text-right font-medium text-white/70">{Number(tx.value).toLocaleString()}</td>
                        <td className="p-3 font-mono text-xs text-blue-400/60">{tx.hash.slice(0, 14)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
