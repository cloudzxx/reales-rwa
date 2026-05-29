import { NextRequest, NextResponse } from "next/server";
import { getReadContract } from "@/lib/contract";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const addressParam = searchParams.get("address");

    const contract = getReadContract();

    if (addressParam) {
      const balance = await contract.balanceOf(addressParam);
      const whitelisted = await contract.whitelist(addressParam);
      const frozen = await contract.frozen(addressParam);
      return NextResponse.json({ balance: balance.toString(), whitelisted, frozen });
    }

    const owner = await contract.owner();
    return NextResponse.json({ owner });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
