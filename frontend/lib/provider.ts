import { JsonRpcProvider } from "ethers";

// RPC endpoint for the Hardhat local node (overridable via env var for Docker)
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

// Singleton JsonRpcProvider — reuse across the app to avoid redundant connections
let provider: JsonRpcProvider | null = null;

export function getProvider(): JsonRpcProvider {
  if (!provider) {
    provider = new JsonRpcProvider(RPC_URL);
  }
  return provider;
}
