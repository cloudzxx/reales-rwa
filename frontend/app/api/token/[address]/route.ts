import { NextRequest, NextResponse } from "next/server";
import { getReadContract } from "@/lib/contract";
import { formatEther } from "ethers";

// GET /api/token/[address]  —  Query address details
// Returns: balance, whitelist status, freeze status, and the last 20 Transfer events
// Events are filtered by this address being either sender or recipient
export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const contract = getReadContract();
    const bal = await contract.balanceOf(params.address);
    const whitelisted = await contract.whitelist(params.address);
    const isFrozen = await contract.frozen(params.address);

    // Fetch all Transfer events from the contract and filter by this address
    const filter = contract.filters.Transfer();
    const events = await contract.queryFilter(filter, 0);

    const transfers = events
      .filter((e: any) => {
        // e.args[0] = from, e.args[1] = to
        return (
          e.args[0].toLowerCase() === params.address.toLowerCase() ||
          e.args[1].toLowerCase() === params.address.toLowerCase()
        );
      })
      // Keep only the most recent 20 entries
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
