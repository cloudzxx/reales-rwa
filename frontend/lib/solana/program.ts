import { PublicKey } from "@solana/web3.js";

// 部署后替换为实际地址
export const SOLANA_PROGRAM_ID = new PublicKey(
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
);

// SPL Token 的 TOKEN_PROGRAM_ID
export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

// 关联代币账户地址 (ATA) 推导
export function findAta(mint: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
  )[0];
}

// 白名单 PDA 推导
export function findWhitelistPda(
  user: PublicKey,
  programId: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("wl"), user.toBuffer()],
    programId
  )[0];
}

// 权限 PDA 推导 (freeze_authority)
export function findAuthPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("auth")], programId)[0];
}
