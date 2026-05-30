import { NextRequest, NextResponse } from "next/server";
import { getReadContract } from "@/lib/contract";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const addressParam = searchParams.get("address");
    const tokenId = searchParams.get("tokenId") || "0";

    const contract = getReadContract();

    if (addressParam) {
      const firstId = BigInt(tokenId === "0" ? await contract.assetIds(0) : tokenId);
      const balance = await contract.balanceOf(addressParam, firstId);
      const whitelisted = await contract.whitelist(addressParam);
      const frozen = await contract.frozen(addressParam);
      return NextResponse.json({
        balance: (Number(balance) / 1e18).toFixed(4),
        whitelisted,
        frozen,
      });
    }

    const owner = await contract.owner();
    return NextResponse.json({ owner });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}