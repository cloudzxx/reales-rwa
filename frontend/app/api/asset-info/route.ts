import { NextResponse } from "next/server";
import { getReadContract } from "@/lib/contract";

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

    const [name, issuer, assetType, maxSupplyBig] = await contract.getAssetInfo();
    const totalSupplyBig = await contract.totalSupply();
    const maxSupply = Number(maxSupplyBig) / 1e18;
    const totalSupply = Number(totalSupplyBig) / 1e18;

    return NextResponse.json({
      name,
      issuer,
      assetType,
      maxSupply,
      totalSupply,
      contractAddress: address,
    });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("call revert") || msg.includes("could not decode")) {
      return NextResponse.json(
        { error: "Contract not found on this network", code: "NO_CONTRACT" },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}