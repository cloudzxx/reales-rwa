import { NextRequest, NextResponse } from "next/server";
import { getWriteContract } from "@/lib/contract";

export async function POST(request: NextRequest) {
  try {
    const { address, action } = await request.json();

    if (!address || !action) {
      return NextResponse.json(
        { error: "Missing 'address' or 'action' (add/remove)" },
        { status: 400 }
      );
    }

    const contract = getWriteContract();
    let tx;

    if (action === "add") {
      tx = await contract.addToWhitelist(address);
    } else if (action === "remove") {
      tx = await contract.removeFromWhitelist(address);
    } else {
      return NextResponse.json(
        { error: "action must be 'add' or 'remove'" },
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
    console.error("Whitelist error:", err);
    return NextResponse.json(
      { error: err.message || "Transaction failed" },
      { status: 500 }
    );
  }
}
