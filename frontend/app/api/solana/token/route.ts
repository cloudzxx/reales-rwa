import { NextRequest, NextResponse } from "next/server";
import { getSolanaConnection } from "@/lib/solana/provider";
import { PublicKey } from "@solana/web3.js";

// GET /api/solana/token?address=xxx — 查询 Solana 地址的 SPL Token 持仓
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const connection = getSolanaConnection();
    const pubkey = new PublicKey(address);

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

// POST /api/solana/token — 模拟 Solana 代币操作
// 需要 Anchor 程序部署后才能实际执行链上交易
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, to, amount, from } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    // 模拟返回交易签名（实际需调用 Anchor 程序）
    const mockSignature = `sol_tx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    return NextResponse.json({
      success: true,
      signature: mockSignature,
      action,
      message: `Simulated ${action} on Solana localnet`,
    });
  } catch (err: any) {
    console.error("Solana POST error:", err);
    return NextResponse.json(
      { error: err.message || "Solana operation failed" },
      { status: 500 }
    );
  }
}
