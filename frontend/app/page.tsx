"use client";

import { useEffect, useState } from "react";
import { getReadContract } from "@/lib/contract";
import { formatEther } from "ethers";

interface AssetInfo {
  name: string;
  issuer: string;
  assetType: string;
  maxSupply: string;
  totalSupply: string;
  contractAddress: string;
}

export default function HomePage() {
  const [asset, setAsset] = useState<AssetInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const contract = getReadContract();
        const [name, issuer, assetType, maxSupply] =
          await contract.getAssetInfo();
        const totalSupply = await contract.totalSupply();
        const address = await contract.getAddress();

        setAsset({
          name,
          issuer,
          assetType,
          maxSupply: formatEther(maxSupply),
          totalSupply: formatEther(totalSupply),
          contractAddress: address,
        });
      } catch (err) {
        console.error("Failed to load asset info:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-400/80">Failed to load asset data. Is the Hardhat node running?</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">RWA Tokenization</h1>
          <p className="text-sm text-white/40 mt-1">Real World Asset on-chain management</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Chain Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400/20 to-blue-500/20 border border-blue-400/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h2 className="text-sm font-medium text-white/70">Asset Overview</h2>
          </div>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-white/30">Asset Name</dt>
              <dd className="text-base font-medium text-white/90 mt-0.5">{asset.name}</dd>
            </div>
            <div className="flex gap-8">
              <div>
                <dt className="text-xs text-white/30">Issuer</dt>
                <dd className="text-sm text-white/80 mt-0.5">{asset.issuer}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/30">Type</dt>
                <dd className="text-sm text-white/80 mt-0.5">{asset.assetType}</dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-600/20 border border-violet-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-sm font-medium text-white/70">Token Supply</h2>
          </div>
          <dl className="space-y-4">
            <div className="flex gap-8">
              <div className="flex-1">
                <dt className="text-xs text-white/30">Total Supply</dt>
                <dd className="text-lg font-semibold text-white mt-0.5">{Number(asset.totalSupply).toLocaleString()}</dd>
              </div>
              <div className="flex-1">
                <dt className="text-xs text-white/30">Max Supply</dt>
                <dd className="text-lg font-semibold text-white mt-0.5">{Number(asset.maxSupply).toLocaleString()}</dd>
              </div>
            </div>
            <div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-violet-400 rounded-full" style={{ width: `${(Number(asset.totalSupply) / Number(asset.maxSupply)) * 100}%` }} />
              </div>
              <p className="text-xs text-white/30 mt-1.5">
                {((Number(asset.totalSupply) / Number(asset.maxSupply)) * 100).toFixed(2)}% of max supply minted
              </p>
            </div>
            <div>
              <dt className="text-xs text-white/30">Contract</dt>
              <dd className="text-sm font-mono text-blue-300/80 mt-0.5 break-all">{asset.contractAddress}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6">
        <h2 className="text-sm font-medium text-white/70 mb-4">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Issue", desc: "Owner mints tokenized real estate to whitelisted addresses" },
            { step: "02", title: "Transfer", desc: "Tokens transfer only between whitelisted addresses" },
            { step: "03", title: "Freeze", desc: "Owner can freeze suspicious addresses instantly" },
            { step: "04", title: "Compliance", desc: "AI agent analyzes on-chain behavior & risk" },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <span className="text-xs font-mono text-blue-300/60">{step}</span>
              <h3 className="text-sm font-medium text-white/80 mt-1.5 mb-1">{title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
