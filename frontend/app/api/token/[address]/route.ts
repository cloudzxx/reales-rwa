import { NextRequest, NextResponse } from "next/server";
import { getReadContract } from "@/lib/contract";
import { formatEther } from "ethers";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const contract = getReadContract();
    const bal = await contract.balanceOf(params.address);
    const whitelisted = await contract.whitelist(params.address);
    const isFrozen = await contract.frozen(params.address);

    const filter = contract.filters.Transfer();
    const events = await contract.queryFilter(filter, -100000);

    const transfers = events
      .filter((e: any) => {
        return (
          e.args[0].toLowerCase() === params.address.toLowerCase() ||
          e.args[1].toLowerCase() === params.address.toLowerCase()
        );
      })
      .slice(-20)
      .reverse()
      .map((e: any) => ({
        from: e.args[0],
        to: e.args[1],
        value: formatEther(e.args[2]),
        hash: e.transactionHash,
        blockNumber: e.blockNumber,
      }));

    return NextResponse.json({
      address: params.address,
      balance: formatEther(bal),
      isWhitelisted,
      isFrozen,
      transfers,
    });
  } catch (err: any) {
    console.error("Query error:", err);
    return NextResponse.json(
      { error: err.message || "Query failed" },
      { status: 500 }
    );
  }
}
