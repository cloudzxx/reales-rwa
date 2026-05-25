import { JsonRpcProvider } from "ethers";

// Hardhat 本地节点的 RPC 地址（Docker 环境下通过环境变量覆盖）
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

// 单例 JsonRpcProvider，复用连接避免重复创建
let provider: JsonRpcProvider | null = null;

export function getProvider(): JsonRpcProvider {
  if (!provider) {
    provider = new JsonRpcProvider(RPC_URL);
  }
  return provider;
}