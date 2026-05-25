"use client";

import { useEffect, useState } from "react";
import { getReadContract } from "@/lib/contract";
import { formatEther } from "ethers";
import { useI18n } from "@/lib/i18n/context";

interface AssetInfo {
  name: string;
  issuer: string;
  assetType: string;
  maxSupply: string;
  totalSupply: string;
  contractAddress: string;
}

export default function HomePage() {
  const { t } = useI18n();
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
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-500">{t("home.loadError")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("home.title")}</h1>
          <p className="text-lg text-gray-500 mt-1">{t("home.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {t("home.chainActive")}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-200 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-700">{t("home.assetOverview")}</h2>
          </div>
          <dl className="space-y-5">
            <div>
              <dt className="text-sm text-gray-400">{t("home.assetName")}</dt>
              <dd className="text-xl font-medium text-gray-900 mt-0.5">{asset.name}</dd>
            </div>
            <div className="flex gap-10">
              <div>
                <dt className="text-sm text-gray-400">{t("home.issuer")}</dt>
                <dd className="text-lg text-gray-800 mt-0.5">{asset.issuer}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">{t("home.assetType")}</dt>
                <dd className="text-lg text-gray-800 mt-0.5">{asset.assetType}</dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-violet-200 border border-violet-200 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-700">{t("home.tokenSupply")}</h2>
          </div>
          <dl className="space-y-5">
            <div className="flex gap-10">
              <div className="flex-1">
                <dt className="text-sm text-gray-400">{t("home.totalSupply")}</dt>
                <dd className="text-2xl font-semibold text-gray-900 mt-0.5">{Number(asset.totalSupply).toLocaleString()}</dd>
              </div>
              <div className="flex-1">
                <dt className="text-sm text-gray-400">{t("home.maxSupply")}</dt>
                <dd className="text-2xl font-semibold text-gray-900 mt-0.5">{Number(asset.maxSupply).toLocaleString()}</dd>
              </div>
            </div>
            <div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" style={{ width: `${(Number(asset.totalSupply) / Number(asset.maxSupply)) * 100}%` }} />
              </div>
              <p className="text-sm text-gray-400 mt-1.5">
                {t("home.percentMinted").replace("{{pct}}", ((Number(asset.totalSupply) / Number(asset.maxSupply)) * 100).toFixed(2))}
              </p>
            </div>
            <div>
              <dt className="text-sm text-gray-400">{t("home.contract")}</dt>
              <dd className="text-base font-mono text-blue-600 mt-0.5 break-all">{asset.contractAddress}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">{t("home.howItWorks")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { step: "01", titleKey: "home.step1Title", descKey: "home.step1Desc" },
            { step: "02", titleKey: "home.step2Title", descKey: "home.step2Desc" },
            { step: "03", titleKey: "home.step3Title", descKey: "home.step3Desc" },
            { step: "04", titleKey: "home.step4Title", descKey: "home.step4Desc" },
          ].map(({ step, titleKey, descKey }) => (
            <div key={step} className="bg-gray-50 border border-gray-100 rounded-xl p-5">
              <span className="text-sm font-mono text-blue-500">{step}</span>
              <h3 className="text-lg font-semibold text-gray-800 mt-2 mb-1.5">{t(titleKey as any)}</h3>
              <p className="text-base text-gray-500 leading-relaxed">{t(descKey as any)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
