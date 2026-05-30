import { NextResponse } from "next/server";
import { getReadContract } from "@/lib/contract";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const contract = getReadContract();
    const address = await contract.getAddress();

    if (address === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json(
        { error: "CONTRACT_ADDRESS not configured", code: "NO_CONTRACT" },
        { status: 404 },
      );
    }

    const firstId = await contract.assetIds(0);
    const cfg = await contract.assets(firstId);
    const supply = await contract.totalSupply(firstId);

    return NextResponse.json({
      name: cfg.name,
      issuer: cfg.issuer,
      assetType: cfg.assetType,
      maxSupply: Number(cfg.maxSupply) / 1e18,
      totalSupply: Number(supply) / 1e18,
      contractAddress: address,
      tokenId: Number(firstId),
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}