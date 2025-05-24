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
      <h1 className="text-2xl font-bold mb-6">Address Query</h1>

      <form onSubmit={handleSearch} className="max-w-lg flex gap-2 mb-6">
        <input
          type="text"
          value={searchAddr}
          onChange={(e) => setSearchAddr(e.target.value)}
          placeholder="Enter wallet address (0x...)"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-medium rounded-lg px-6 py-2 transition"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 text-red-300 mb-6">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400">Balance</p>
              <p className="text-xl font-semibold">
                {Number(data.balance).toLocaleString()} REST
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400">Whitelist Status</p>
              <p
                className={`text-xl font-semibold ${
                  data.isWhitelisted ? "text-green-400" : "text-red-400"
                }`}
              >
                {data.isWhitelisted ? "Whitelisted" : "Not Whitelisted"}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400">Freeze Status</p>
              <p
                className={`text-xl font-semibold ${
                  data.isFrozen ? "text-red-400" : "text-green-400"
                }`}
              >
                {data.isFrozen ? "Frozen" : "Active"}
              </p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <h2 className="text-lg font-semibold p-4 border-b border-gray-800">
              Transfer History ({data.transfers.length})
            </h2>
            {data.transfers.length === 0 ? (
              <p className="p-4 text-gray-500">No transfers found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="text-left p-3">From</th>
                      <th className="text-left p-3">To</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-left p-3">Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transfers.map((tx, i) => (
                      <tr
                        key={tx.hash + i}
                        className="border-b border-gray-800/50"
                      >
                        <td className="p-3 font-mono text-xs">
                          {tx.from.slice(0, 10)}...
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {tx.to.slice(0, 10)}...
                        </td>
                        <td className="p-3 text-right">
                          {Number(tx.value).toLocaleString()} REST
                        </td>
                        <td className="p-3 font-mono text-xs text-blue-400">
                          {tx.hash.slice(0, 14)}...
                        </td>
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
