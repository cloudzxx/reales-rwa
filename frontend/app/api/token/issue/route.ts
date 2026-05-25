import { NextRequest, NextResponse } from "next/server";
import { getWriteContract } from "@/lib/contract";
import { parseEther } from "ethers";

// POST /api/token/issue  —  Mint new tokens
// Body: { to: string, amount: string (in REST/ether units) }
// Signs as the contract owner (OWNER_PRIVATE_KEY) and submits the mint transaction
// The contract enforces: recipient must be whitelisted + not frozen + supply cap not exceeded
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
