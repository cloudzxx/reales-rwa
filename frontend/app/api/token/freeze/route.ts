import { NextRequest, NextResponse } from "next/server";
import { getWriteContract } from "@/lib/contract";

export async function POST(request: NextRequest) {
  try {
    const { address, action } = await request.json();

    if (!address || !action) {
      return NextResponse.json(
        { error: "Missing 'address' or 'action' (freeze/unfreeze)" },
        { status: 400 }
      );
    }

    const contract = getWriteContract();
    let tx;

    if (action === "freeze") {
      tx = await contract.freeze(address);
    } else if (action === "unfreeze") {
      tx = await contract.unfreeze(address);
    } else {
      return NextResponse.json(
        { error: "action must be 'freeze' or 'unfreeze'" },
        { status: 400 }
      );
    }

    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (err: any) {
    console.error("Freeze error:", err);
    return NextResponse.json(
      { error: err.message || "Transaction failed" },
      { status: 500 }
    );
  }
}
