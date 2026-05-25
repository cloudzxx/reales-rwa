import { Contract, Wallet } from "ethers";
import { getProvider } from "./provider";
import { CONTRACT_ABI } from "./abi";
import { CONTRACT_ADDRESS } from "./deployment";

// Returns a read-only contract handle — uses the public provider, no signing needed
// Suitable for queries: balanceOf, whitelist, assetInfo, etc.
export function getReadContract(): Contract {
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, getProvider());
}

// Returns a write-capable contract handle — creates a Wallet signer from OWNER_PRIVATE_KEY
// Used exclusively by API routes (server-side) to sign and send transactions
// Requires OWNER_PRIVATE_KEY to be set in environment
export function getWriteContract(): Contract {
  const privateKey = process.env.OWNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("OWNER_PRIVATE_KEY environment variable is not set");
  }
  const signer = new Wallet(privateKey, getProvider());
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}
