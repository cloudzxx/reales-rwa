import { Contract, Wallet } from "ethers";
import { getProvider } from "./provider";
import { CONTRACT_ABI } from "./abi";
import { CONTRACT_ADDRESS } from "./deployment";

export function getReadContract(): Contract {
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, getProvider());
}

export function getWriteContract(): Contract {
  const privateKey = process.env.OWNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("OWNER_PRIVATE_KEY environment variable is not set");
  }
  const signer = new Wallet(privateKey, getProvider());
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}
