"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { getReadContract } from "@/lib/contract";
import { useI18n } from "@/lib/i18n/context";

export default function IssuePage() {
  const { t } = useI18n();
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
  const [contractOwner, setContractOwner] = useState("");

  useEffect(() => {
    async function checkOwner() {
      try {
        const contract = getReadContract();
        const owner = await contract.owner();
        setContractOwner(owner);
        if (address) {
          setIsOwner(owner.toLowerCase() === address.toLowerCase());
        }
      } catch {
        setIsOwner(false);
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
      <div className="py-24 text-center max-w-lg mx-auto">
        <p className="text-xl text-gray-500 mb-6">{t("issue.connectPrompt")}</p>
        <div className="bg-white border border-gray-200 rounded-xl p-5 text-left shadow-sm">
          <p className="text-base text-gray-400 mb-2">{t("issue.contractOwner")}</p>
          <p className="text-lg font-mono text-blue-600 break-all">{contractOwner || t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="py-24 text-center max-w-lg mx-auto">
        <p className="text-xl text-red-500 mb-6">{t("issue.notOwner")}</p>
        <div className="bg-white border border-gray-200 rounded-xl p-5 text-left shadow-sm space-y-4">
          <div>
            <p className="text-base text-gray-400 mb-1">{t("issue.contractOwner")}</p>
            <p className="text-lg font-mono text-blue-600 break-all">{contractOwner || "..."}</p>
          </div>
          <div>
            <p className="text-base text-gray-400 mb-1">{t("issue.yourAddress")}</p>
            <p className="text-lg font-mono text-gray-600 break-all">{address}</p>
          </div>
        </div>
        <p className="text-base text-gray-400 mt-5">
          {t("issue.importKey")}
          {contractOwner === "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" && (
            <><br /><code className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded mt-2 inline-block break-all">0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</code></>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("issue.title")}</h1>
        <p className="text-lg text-gray-500 mt-1">{t("issue.subtitle")}</p>
      </div>

      <form onSubmit={handleIssue} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">{t("issue.recipient")}</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x..."
            required
            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition font-mono"
          />
        </div>

        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">{t("issue.amount")}</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            required
            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold rounded-xl px-4 py-3 text-lg transition-all"
        >
          {loading ? t("issue.buttonLoading") : t("issue.button")}
        </button>
      </form>

      {error && (
        <div className="mt-5 bg-red-50 border border-red-200 rounded-xl p-5 text-red-600 text-lg">{t("issue.error")}: {error}</div>
      )}

      {result && (
        <div className="mt-5 bg-green-50 border border-green-200 rounded-xl p-5 text-green-700 space-y-2">
          <p className="text-lg font-semibold">{t("issue.success")}</p>
          <p className="text-base font-mono break-all text-green-600">{t("issue.tx")}: {result.txHash}</p>
          <p className="text-base text-green-600">{t("issue.block")} #{result.blockNumber}</p>
        </div>
      )}
    </div>
  );
}
