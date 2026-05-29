import { NextResponse } from "next/server";
import { getReadContract } from "@/lib/contract";

export async function GET() {
  try {
    const contract = getReadContract();
    const [name, issuer, assetType, maxSupplyBig] = await contract.getAssetInfo();
    const totalSupplyBig = await contract.totalSupply();
    const address = await contract.getAddress();
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
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
