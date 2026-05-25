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
      <div className="py-24 text-center">
        <p className="text-white/40">Connect your wallet to issue tokens.</p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-400/80">Only the contract owner can issue tokens.</p>
        <p className="text-xs text-white/30 mt-2 font-mono">{address}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Issue Tokens</h1>
        <p className="text-sm text-white/40 mt-1">Mint new RWA tokens to a whitelisted address</p>
      </div>

      <form onSubmit={handleIssue} className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-white/60 mb-2">Recipient Address</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x..."
            required
            className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/60 mb-2">Amount (REST)</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            required
            className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-white/[0.08] disabled:to-white/[0.08] disabled:text-white/20 text-white font-medium rounded-xl px-4 py-2.5 transition-all"
        >
          {loading ? "Issuing..." : "Issue Tokens"}
        </button>
      </form>

      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {result && (
        <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 space-y-2">
          <p className="font-medium">Tokens issued successfully</p>
          <p className="text-xs font-mono break-all text-emerald-400/70">TX: {result.txHash}</p>
          <p className="text-xs text-emerald-400/70">Block #{result.blockNumber}</p>
        </div>
      )}
    </div>
  );
}
