"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  RainbowKitProvider,
  ConnectButton,
  darkTheme,
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
  return (
    <header className="sticky top-0 z-50 bg-[#0a0b1e]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center text-white text-sm font-bold group-hover:shadow-lg group-hover:shadow-blue-500/25 transition-shadow">R</span>
          <span className="text-sm font-semibold text-white/90">RWA Platform</span>
        </Link>
        <nav className="flex gap-0.5">
          {[
            { href: "/", label: "Home" },
            { href: "/issue", label: "Issue" },
            { href: "/query", label: "Query" },
            { href: "/compliance", label: "Compliance" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-white/50 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.06] transition"
            >
              {label}
            </Link>
          ))}
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
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#6366f1',
          accentColorForeground: '#fff',
          borderRadius: 'medium',
          fontStack: 'system',
          overlayBlur: 'small',
        })}>
          <Header />
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
