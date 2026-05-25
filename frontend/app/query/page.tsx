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
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Address Query</h1>

      <form onSubmit={handleSearch} className="max-w-lg flex gap-2 mb-6">
        <input
          type="text"
          value={searchAddr}
          onChange={(e) => setSearchAddr(e.target.value)}
          placeholder="Enter wallet address (0x...)"
          className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg px-6 py-2.5 transition"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 mb-6">{error}</div>
      )}

      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Balance</p>
              <p className="text-xl font-semibold text-gray-900">
                {Number(data.balance).toLocaleString()} REST
              </p>
            </div>
            <div className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Whitelist</p>
              <p className={`text-xl font-semibold ${data.isWhitelisted ? "text-green-600" : "text-red-500"}`}>
                {data.isWhitelisted ? "Whitelisted" : "Not Whitelisted"}
              </p>
            </div>
            <div className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</p>
              <p className={`text-xl font-semibold ${data.isFrozen ? "text-red-500" : "text-green-600"}`}>
                {data.isFrozen ? "Frozen" : "Active"}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm overflow-hidden">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider p-5 border-b border-gray-100">
              Transfer History ({data.transfers.length})
            </h2>
            {data.transfers.length === 0 ? (
              <p className="p-5 text-gray-400">No transfers found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-xs">
                      <th className="text-left p-3 font-medium">From</th>
                      <th className="text-left p-3 font-medium">To</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transfers.map((tx, i) => (
                      <tr key={tx.hash + i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="p-3 font-mono text-xs text-gray-600">{tx.from.slice(0, 10)}...</td>
                        <td className="p-3 font-mono text-xs text-gray-600">{tx.to.slice(0, 10)}...</td>
                        <td className="p-3 text-right font-medium">{Number(tx.value).toLocaleString()} REST</td>
                        <td className="p-3 font-mono text-xs text-blue-500">{tx.hash.slice(0, 14)}...</td>
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
