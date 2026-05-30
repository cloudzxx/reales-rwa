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

    const [
      name, issuer, assetType, maxSupply, totalSupply,
    ] = await Promise.all([
      contract.assetName(),
      contract.issuer(),
      contract.assetType(),
      contract.maxSupply(),
      contract.totalSupply(),
    ]);

    return NextResponse.json({
      name,
      issuer,
      assetType,
      maxSupply: Number(maxSupply) / 1e18,
      totalSupply: Number(totalSupply) / 1e18,
      contractAddress: address,
    });
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes("call revert") || msg.includes("could not decode")) {
      return NextResponse.json(
        { error: "Contract not found on this network", code: "NO_CONTRACT" },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}