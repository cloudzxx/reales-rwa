import { JsonRpcProvider } from "ethers";

const RPC_URL = process.env.RPC_URL || "https://ethereum-sepolia.publicnode.com";

let provider: JsonRpcProvider | null = null;

export function getProvider(): JsonRpcProvider {
  if (!provider) {
    provider = new JsonRpcProvider(RPC_URL);
  }
  return provider;
}