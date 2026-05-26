import { NextRequest, NextResponse } from "next/server";
import { getSolanaConnection } from "@/lib/solana/provider";
import {
  PublicKey, Keypair, LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint, createAssociatedTokenAccountIdempotent,
  mintTo, getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

// 测试用 payer（持久化在模块级，避免重复创建）
let payerKeypair: Keypair | null = null;
let mintPubkey: PublicKey | null = null;

async function ensurePayer(connection: Awaited<ReturnType<typeof getSolanaConnection>>): Promise<Keypair> {
  if (!payerKeypair) {
    payerKeypair = Keypair.generate();
  }
  try {
    const balance = await connection.getBalance(payerKeypair.publicKey);
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      const sig = await connection.requestAirdrop(payerKeypair.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig);
    }
  } catch {}
  return payerKeypair;
}

// GET /api/solana/token?address=xxx — 查询 SPL Token 持仓
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    if (!address) return NextResponse.json({ error: "Missing address" }, { status: 400 });

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

    // 获取交易签名
    let transfers: Array<{ signature: string; slot: number; blockTime: number | null }> = [];
    try {
      const sigs = await connection.getSignaturesForAddress(pubkey, { limit: 20 });
      transfers = sigs.map(s => ({
        signature: s.signature,
        slot: s.slot,
        blockTime: s.blockTime,
      }));
    } catch {}

    return NextResponse.json({ address, tokens, transfers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/solana/token — 铸造 SPL Token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, to, amount } = body;
    if (!action) return NextResponse.json({ error: "Missing action" }, { status: 400 });

    const connection = getSolanaConnection();
    const amountNum = parseInt(amount || "100", 10);

    if (action === "mint") {
      const payer = await ensurePayer(connection);

      // 创建 token mint（幂等——只创建一次）
      if (!mintPubkey) {
        mintPubkey = await createMint(
          connection, payer, payer.publicKey,
          payer.publicKey, 9
        );
      }

      const recipientPubkey = new PublicKey(to);
      const ata = await createAssociatedTokenAccountIdempotent(
        connection, payer, mintPubkey, recipientPubkey
      );

      const txSig = await mintTo(
        connection, payer, mintPubkey,
        ata, payer, amountNum * 1_000_000_000
      );

      return NextResponse.json({
        success: true,
        signature: txSig,
        action: "mint",
        mint: mintPubkey.toBase58(),
        recipient: to,
        amount: amountNum,
      });
    }

    return NextResponse.json({ success: true, action, message: `Simulated ${action}` });
  } catch (err: any) {
    console.error("Solana POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
