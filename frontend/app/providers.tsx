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
import { ChainProvider, useChain, type Chain } from "@/lib/chain-context";
import { SolanaProviders } from "@/lib/solana/SolanaProviders";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const connectors = connectorsForWallets(
  [
    {
      groupName: " ",
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
  const { chain, setChain } = useChain();
  const toggleLang = () => setLang(lang === "en" ? "zh" : "en");

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center text-white font-bold group-hover:shadow-lg group-hover:shadow-blue-500/25 transition-shadow">R</span>
          <span className="font-semibold text-gray-800">{t("nav.platform")}</span>
        </Link>
        <select
          value={chain}
          onChange={e => setChain(e.target.value as Chain)}
          className="ml-2 text-xs font-mono bg-gray-100 border border-gray-200 rounded-md px-2 py-1 text-gray-600 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="evm">Ethereum</option>
          <option value="solana">Solana</option>
        </select>
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

        </nav>
        {chain === "evm" ? <ConnectButton /> : <WalletMultiButton />}
        <button onClick={toggleLang} className="px-2.5 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition font-medium">
          {lang === "en" ? "中文" : "EN"}
        </button>
      </div>
    </header>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SolanaProviders>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={lightTheme({
          accentColor: '#3b82f6',
          accentColorForeground: '#fff',
          borderRadius: 'large',
          fontStack: 'system',
        })}>
          <I18nProvider>
            <ChainProvider>
              <Header />
              <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
            </ChainProvider>
          </I18nProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
    </SolanaProviders>
  );
}
