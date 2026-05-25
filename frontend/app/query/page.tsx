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
        <h1 className="text-3xl font-bold text-gray-900">Address Query</h1>
        <p className="text-lg text-gray-500 mt-1">Look up balance, status, and transaction history</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6 max-w-2xl">
        <input
          type="text"
          value={searchAddr}
          onChange={(e) => setSearchAddr(e.target.value)}
          placeholder="Enter wallet address (0x...)"
          className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition font-mono"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold rounded-xl px-8 py-3 text-lg transition-all"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-600 text-lg mb-6">{error}</div>
      )}

      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <p className="text-base text-gray-400 mb-1">Balance</p>
              <p className="text-3xl font-semibold text-gray-900">{Number(data.balance).toLocaleString()}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <p className="text-base text-gray-400 mb-1">Whitelist</p>
              <p className={`text-2xl font-semibold ${data.isWhitelisted ? 'text-green-600' : 'text-red-500'}`}>
                {data.isWhitelisted ? "Whitelisted" : "Not Whitelisted"}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <p className="text-base text-gray-400 mb-1">Status</p>
              <p className={`text-2xl font-semibold ${data.isFrozen ? 'text-red-500' : 'text-green-600'}`}>
                {data.isFrozen ? "Frozen" : "Active"}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <h2 className="text-xl font-semibold text-gray-700 p-6 border-b border-gray-100">
              Transfer History <span className="text-gray-400 font-normal">({data.transfers.length})</span>
            </h2>
            {data.transfers.length === 0 ? (
              <p className="p-6 text-gray-400 text-lg">No transfers found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400">
                      <th className="text-left px-4 py-3 font-medium">From</th>
                      <th className="text-left px-4 py-3 font-medium">To</th>
                      <th className="text-right px-4 py-3 font-medium">Amount</th>
                      <th className="text-left px-4 py-3 font-medium">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transfers.map((tx, i) => (
                      <tr key={tx.hash + i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm text-gray-600">{tx.from.slice(0, 10)}...</td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-600">{tx.to.slice(0, 10)}...</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">{Number(tx.value).toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-sm text-blue-500">{tx.hash.slice(0, 14)}...</td>
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
