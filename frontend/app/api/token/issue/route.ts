import { NextRequest, NextResponse } from "next/server";
import { getWriteContract } from "@/lib/contract";
import { parseEther } from "ethers";

export async function POST(request: NextRequest) {
  try {
    const { to, tokenId, amount } = await request.json();
    if (!to || tokenId === undefined || !amount) {
      return NextResponse.json(
        { error: "Missing 'to', 'tokenId', or 'amount' in request body" },
        { status: 400 }
      );
    }

    const contract = getWriteContract();
    const tx = await contract.mint(to, BigInt(tokenId), parseEther(amount), "0x");
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (err: any) {
    console.error("Mint error:", err);
    return NextResponse.json(
      { error: err.message || "Transaction failed" },
      { status: 500 }
    );
  }
}