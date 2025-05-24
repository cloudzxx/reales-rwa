import { JsonRpcProvider } from "ethers";

let provider: JsonRpcProvider | null = null;

export function getProvider(): JsonRpcProvider {
  if (!provider) {
    provider = new JsonRpcProvider("http://127.0.0.1:8545");
  }
  return provider;
}
