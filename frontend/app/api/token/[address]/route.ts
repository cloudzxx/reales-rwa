import { NextRequest, NextResponse } from "next/server";
import { getReadContract } from "@/lib/contract";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const contract = getReadContract();
    const whitelisted = await contract.whitelist(params.address);
    const isFrozen = await contract.frozen(params.address);

    const firstId = await contract.assetIds(0);
    const bal = await contract.balanceOf(params.address, firstId);
    const total = await contract.totalSupply(firstId);
    const format = (v: bigint) => (Number(v) / 1e18).toFixed(4);

    const filter = contract.filters.TransferSingle();
    const events = await contract.queryFilter(filter, -20000);

    const transfers = events
      .filter((e: any) => {
        const from = e.args[0]?.toLowerCase();
        const to = e.args[1]?.toLowerCase();
        const addr = params.address.toLowerCase();
        return from === addr || to === addr;
      })
      .slice(-20)
      .reverse()
      .map((e: any) => ({
        from: e.args[0],
        to: e.args[1],
        value: format(e.args[3]),
        hash: e.transactionHash,
        blockNumber: e.blockNumber,
      }));

    return NextResponse.json({
      address: params.address,
      balance: format(bal),
      totalSupply: format(total),
      isWhitelisted: whitelisted,
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