"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { getReadContract } from "@/lib/contract";
import { useI18n } from "@/lib/i18n/context";
import { useChain } from "@/lib/chain-context";

export default function IssuePage() {
  const { t } = useI18n();
  const { chain } = useChain();
  const evmWallet = useAccount();
  const solWallet = useWallet();

  const isEvmConnected = evmWallet.isConnected;
  const evmAddress = evmWallet.address;
  const isSolConnected = solWallet.connected;
  const solAddress = solWallet.publicKey?.toBase58();

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    txHash: string;
    blockNumber?: number;
    signature?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [checking, setChecking] = useState(true);
  const [contractOwner, setContractOwner] = useState("");

  useEffect(() => {
    if (chain === "evm") {
      (async () => {
        try {
          const contract = getReadContract();
          const owner = await contract.owner();
          setContractOwner(owner);
          if (evmAddress) {
            setIsOwner(owner.toLowerCase() === evmAddress.toLowerCase());
          }
        } catch {
          setIsOwner(false);
        }
        setChecking(false);
      })();
    } else {
      // Solana: any connected wallet is admin on localnet
      setContractOwner("");
      setIsOwner(solWallet.connected);
      setChecking(false);
    }
  }, [chain, evmAddress, solWallet.connected]);

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (chain === "evm") {
        const res = await fetch("/api/token/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, amount }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResult(data);
      } else {
        const res = await fetch("/api/solana/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mint", to, amount, from: solAddress }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const connected = chain === "evm" ? isEvmConnected : isSolConnected;
  const currentAddress = chain === "evm" ? evmAddress : solAddress;

  if (!connected) {
    return (
      <div className="py-24 text-center max-w-lg mx-auto">
        <p className="text-xl text-gray-500 mb-6">{t("issue.connectPrompt")}</p>
        <div className="bg-white border border-gray-200 rounded-xl p-5 text-left shadow-sm">
          <p className="text-base text-gray-400 mb-2">{t("issue.contractOwner")}</p>
          {chain === "evm" ? (
            <p className="text-lg font-mono text-blue-600 break-all">{contractOwner || t("common.loading")}</p>
          ) : (
            <p className="text-lg text-gray-600">{t("issue.anyWallet")}</p>
          )}
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
    const pk = chain === "evm"
      ? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
      : "use the Phantom wallet that deployed the program";

    return (
      <div className="py-24 text-center max-w-lg mx-auto">
        <p className="text-xl text-red-500 mb-6">{t("issue.notOwner")}</p>
        <div className="bg-white border border-gray-200 rounded-xl p-5 text-left shadow-sm space-y-4">
          <div>
            <p className="text-base text-gray-400 mb-1">{t("issue.contractOwner")}</p>
            {chain === "evm" ? (
              <p className="text-lg font-mono text-blue-600 break-all">{contractOwner || "..."}</p>
            ) : (
              <p className="text-lg text-gray-600">{t("issue.solanaAdmin")}</p>
            )}
          </div>
          <div>
            <p className="text-base text-gray-400 mb-1">{t("issue.yourAddress")}</p>
            <p className="text-lg font-mono text-gray-600 break-all">{currentAddress}</p>
          </div>
        </div>
        <p className="text-base text-gray-400 mt-5">
          {chain === "evm" ? (
            <>Import the owner private key into {evmAddress ? "the correct wallet" : "MetaMask"}.
              <br /><code className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded mt-2 inline-block break-all">{pk}</code></>
          ) : (
            <>{t("issue.importKeyPhantom")}</>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("issue.title")}</h1>
        <p className="text-lg text-gray-500 mt-1">{t("issue.subtitle")} ({chain.toUpperCase()})</p>
      </div>

      <form onSubmit={handleIssue} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">{t("issue.recipient")}</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={t("issue.placeholderAddress")}
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
          <p className="text-base font-mono break-all text-green-600">{result.txHash || result.signature}</p>
          {result.blockNumber && <p className="text-base text-green-600">{t("issue.block")} #{result.blockNumber}</p>}
        </div>
      )}

      {chain === "solana" && (
        <div className="mt-10 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t("admin.whitelistFreeze")}</h2>
          <p className="text-lg text-gray-500">{t("issue.managedByAnchor")}</p>
        </div>
      )}

      {chain === "evm" && (
        <>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">{t("admin.whitelist")}</h2>
              <p className="text-sm text-gray-400 mb-4">{t("admin.whitelistDesc")}</p>
              <WhitelistSection t={t} />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">{t("admin.freeze")}</h2>
              <p className="text-sm text-gray-400 mb-4">{t("admin.freezeDesc")}</p>
              <FreezeSection t={t} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function WhitelistSection({ t }: { t: any }) {
  const [addr, setAddr] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handle(action: "add" | "remove") {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/token/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(`${action}: ${data.txHash.slice(0, 14)}...`);
    } catch (err: any) {
      setResult("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input type="text" value={addr} onChange={e => setAddr(e.target.value)} placeholder="0x..." className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition font-mono" />
      <div className="flex gap-2">
        <button onClick={() => handle("add")} disabled={loading || !addr} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 text-white font-medium rounded-xl py-2.5 transition">{t("admin.add")}</button>
        <button onClick={() => handle("remove")} disabled={loading || !addr} className="flex-1 bg-red-500 hover:bg-red-400 disabled:bg-gray-300 text-white font-medium rounded-xl py-2.5 transition">{t("admin.remove")}</button>
      </div>
      {result && <p className={`text-base ${result.startsWith("Error") ? "text-red-600" : "text-emerald-600"}`}>{result}</p>}
    </div>
  );
}

function FreezeSection({ t }: { t: any }) {
  const [addr, setAddr] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handle(action: "freeze" | "unfreeze") {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/token/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(`${action}: ${data.txHash.slice(0, 14)}...`);
    } catch (err: any) {
      setResult("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input type="text" value={addr} onChange={e => setAddr(e.target.value)} placeholder="0x..." className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition font-mono" />
      <div className="flex gap-2">
        <button onClick={() => handle("freeze")} disabled={loading || !addr} className="flex-1 bg-red-500 hover:bg-red-400 disabled:bg-gray-300 text-white font-medium rounded-xl py-2.5 transition">{t("admin.freezeBtn")}</button>
        <button onClick={() => handle("unfreeze")} disabled={loading || !addr} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 text-white font-medium rounded-xl py-2.5 transition">{t("admin.unfreeze")}</button>
      </div>
      {result && <p className={`text-base ${result.startsWith("Error") ? "text-red-600" : "text-emerald-600"}`}>{result}</p>}
    </div>
  );
}
