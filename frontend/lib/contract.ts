import { Contract, Wallet } from "ethers";
import { getProvider } from "./provider";
import { CONTRACT_ABI } from "./abi";
import fs from "fs";

function getContractAddress(): string {
  if (process.env.CONTRACT_ADDRESS) {
    return process.env.CONTRACT_ADDRESS;
  }
  try {
    const raw = fs.readFileSync("/app/lib/deployment.json", "utf8");
    return JSON.parse(raw).address;
  } catch {
    return "0x0000000000000000000000000000000000000000";
  }
}

export function getReadContract(): Contract {
  return new Contract(getContractAddress(), CONTRACT_ABI, getProvider());
}

export function getWriteContract(): Contract {
  const privateKey = process.env.OWNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("OWNER_PRIVATE_KEY environment variable is not set");
  }
  const signer = new Wallet(privateKey, getProvider());
  return new Contract(getContractAddress(), CONTRACT_ABI, signer);
}
