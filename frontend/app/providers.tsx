"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  RainbowKitProvider,
  ConnectButton,
  lightTheme,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { WagmiProvider, createConfig, http } from "wagmi";
import { hardhat } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { I18nProvider, useI18n, type Lang } from "@/lib/i18n/context";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, injectedWallet],
    },
  ],
  { appName: "RWA Tokenization", projectId: "00000000" },
);

const config = createConfig({
  chains: [hardhat],
  connectors,
  transports: {
    [hardhat.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

function Header() {
  const { t, lang, setLang } = useI18n();
  const toggleLang = () => setLang(lang === "en" ? "zh" : "en");

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center text-white font-bold group-hover:shadow-lg group-hover:shadow-blue-500/25 transition-shadow">R</span>
          <span className="font-semibold text-gray-800">{t("nav.platform")}</span>
        </Link>
        <nav className="flex items-center gap-1">
          {[
            { href: "/", label: "nav.home" },
            { href: "/issue", label: "nav.issue" },
            { href: "/query", label: "nav.query" },
            { href: "/compliance", label: "nav.compliance" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
              {t(label as any)}
            </Link>
          ))}
          <button onClick={toggleLang} className="ml-2 px-2.5 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition font-medium">
            {lang === "en" ? "中文" : "EN"}
          </button>
        </nav>
        <ConnectButton />
      </div>
    </header>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={lightTheme({
          accentColor: '#3b82f6',
          accentColorForeground: '#fff',
          borderRadius: 'large',
          fontStack: 'system',
        })}>
          <I18nProvider>
            <Header />
            <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
          </I18nProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
