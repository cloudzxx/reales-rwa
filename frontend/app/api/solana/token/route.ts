import { NextRequest, NextResponse } from "next/server";
import { getSolanaConnection } from "@/lib/solana/provider";
import { PublicKey } from "@solana/web3.js";

// GET /api/solana/token?address=xxx — 查询 Solana 地址的 SPL Token 持仓
// 使用 Solana 的 getParsedTokenAccountsByOwner 解析代币账户数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const connection = getSolanaConnection();
    const pubkey = new PublicKey(address);

    // 获取该地址所有 SPL Token 账户的解析数据
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      pubkey,
      { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
    );

    const tokens = tokenAccounts.value.map(({ pubkey, account }) => {
      const info = account.data.parsed.info;
      return {
        account: pubkey.toBase58(),
        mint: info.mint,
        balance: info.tokenAmount.amount,
        decimals: info.tokenAmount.decimals,
        uiBalance: info.tokenAmount.uiAmount,
        isFrozen: info.state === "frozen",
      };
    });

    return NextResponse.json({ address, tokens });
  } catch (err: any) {
    console.error("Solana query error:", err);
    return NextResponse.json(
      { error: err.message || "Solana query failed" },
      { status: 500 }
    );
  }
}
