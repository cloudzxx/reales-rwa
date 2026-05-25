import { Contract, Wallet } from "ethers";
import { getProvider } from "./provider";
import { CONTRACT_ABI } from "./abi";
import { CONTRACT_ADDRESS } from "./deployment";

// 返回只读合约句柄——使用公共 Provider，无需签名
// 适用于查询操作：balanceOf、whitelist、getAssetInfo 等
export function getReadContract(): Contract {
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, getProvider());
}

// 返回可写合约句柄——使用 OWNER_PRIVATE_KEY 创建签名钱包
// 仅在服务端 API Route 中使用（前端不暴露私钥）
// 需要设置 OWNER_PRIVATE_KEY 环境变量
export function getWriteContract(): Contract {
  const privateKey = process.env.OWNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("OWNER_PRIVATE_KEY environment variable is not set");
  }
  const signer = new Wallet(privateKey, getProvider());
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}
