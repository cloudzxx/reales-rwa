import { Connection, clusterApiUrl } from "@solana/web3.js";

const SOLANA_RPC = process.env.SOLANA_RPC_URL || "http://127.0.0.1:8899";

let connection: Connection | null = null;

export function getSolanaConnection(): Connection {
  if (!connection) {
    connection = new Connection(SOLANA_RPC, "confirmed");
  }
  return connection;
}
