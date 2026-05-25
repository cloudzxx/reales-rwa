import { JsonRpcProvider } from "ethers";

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
let provider: JsonRpcProvider | null = null;

export function getProvider(): JsonRpcProvider {
  if (!provider) {
    provider = new JsonRpcProvider(RPC_URL);
  }
  return provider;
}
