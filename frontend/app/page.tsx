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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-500">
          Failed to load asset data. Is the Hardhat node running?
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">RWA Tokenization Platform</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-white border border-gray-200/80 rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Asset Overview</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-gray-400">Asset Name</dt>
              <dd className="text-lg font-medium text-gray-900">{asset.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Issuer</dt>
              <dd className="text-lg font-medium text-gray-900">{asset.issuer}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Asset Type</dt>
              <dd className="text-lg font-medium text-gray-900">{asset.assetType}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Token Supply</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-gray-400">Total Supply</dt>
              <dd className="text-lg font-medium text-gray-900">
                {Number(asset.totalSupply).toLocaleString()} REST
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Max Supply</dt>
              <dd className="text-lg font-medium text-gray-900">
                {Number(asset.maxSupply).toLocaleString()} REST
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Contract Address</dt>
              <dd className="text-sm font-mono text-blue-600 break-all">
                {asset.contractAddress}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white border border-gray-200/80 rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">How It Works</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li><strong className="text-gray-800">Issue:</strong> Contract owner mints tokenized real estate tokens to whitelisted addresses</li>
          <li><strong className="text-gray-800">Transfer:</strong> Tokens can only be held and transferred between whitelisted addresses</li>
          <li><strong className="text-gray-800">Freeze:</strong> Owner can freeze suspicious addresses, blocking their transfers</li>
          <li><strong className="text-gray-800">Compliance:</strong> AI agent analyzes on-chain behavior and generates risk reports</li>
        </ol>
      </div>
    </div>
  );
}
