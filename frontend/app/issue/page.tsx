"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { getReadContract } from "@/lib/contract";

export default function IssuePage() {
  const { isConnected, address } = useAccount();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    txHash: string;
    blockNumber: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkOwner() {
      if (address) {
        try {
          const contract = getReadContract();
          const owner = await contract.owner();
          setIsOwner(owner.toLowerCase() === address.toLowerCase());
        } catch {
          setIsOwner(false);
        }
      }
      setChecking(false);
    }
    checkOwner();
  }, [address]);

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/token/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Connect your wallet to issue tokens.</p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-500">
          Only the contract owner can issue tokens. Your address: {address}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Issue Tokens</h1>

      <form
        onSubmit={handleIssue}
        className="bg-white border border-gray-200/80 rounded-xl p-6 max-w-lg space-y-5 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Recipient Address
          </label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x..."
            required
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Amount (REST)
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            required
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg px-4 py-2.5 transition"
        >
          {loading ? "Issuing..." : "Issue Tokens"}
        </button>
      </form>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 space-y-1">
          <p className="font-semibold">Tokens issued successfully!</p>
          <p className="text-sm">
            TX:{" "}
            <code className="text-xs break-all">{result.txHash}</code>
          </p>
          <p className="text-sm">Block: {result.blockNumber}</p>
        </div>
      )}
    </div>
  );
}
