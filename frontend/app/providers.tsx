"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  RainbowKitProvider,
  ConnectButton,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider, createConfig, http } from "wagmi";
import { hardhat } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";

const config = createConfig({
  chains: [hardhat],
  connectors: [injected()],
  transports: {
    [hardhat.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

function Header() {
  return (
    <header className="border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <nav className="flex gap-6">
          <Link href="/" className="text-sm font-medium text-gray-300 hover:text-white transition">
            Home
          </Link>
          <Link href="/issue" className="text-sm font-medium text-gray-300 hover:text-white transition">
            Issue
          </Link>
          <Link href="/query" className="text-sm font-medium text-gray-300 hover:text-white transition">
            Query
          </Link>
          <Link href="/compliance" className="text-sm font-medium text-gray-300 hover:text-white transition">
            Compliance
          </Link>
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
        <RainbowKitProvider>
          <Header />
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
