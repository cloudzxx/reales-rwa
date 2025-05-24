import { NextRequest, NextResponse } from "next/server";
import { getWriteContract } from "@/lib/contract";
import { parseEther } from "ethers";

export async function POST(request: NextRequest) {
  try {
    const { to, amount } = await request.json();

    if (!to || !amount) {
      return NextResponse.json(
        { error: "Missing 'to' or 'amount' in request body" },
        { status: 400 }
      );
    }

    const contract = getWriteContract();
    const tx = await contract.mint(to, parseEther(amount));
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
