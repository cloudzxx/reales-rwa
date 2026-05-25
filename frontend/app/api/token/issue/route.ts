import { NextRequest, NextResponse } from "next/server";
import { getWriteContract } from "@/lib/contract";
import { parseEther } from "ethers";

// POST /api/token/issue  —  铸造新代币
// 请求体: { to: string, amount: string（REST 单位）}
// 使用 OWNER_PRIVATE_KEY 签名，以合约 Owner 身份提交铸造交易
// 合约内部会校验：接收方必须在白名单内、未被冻结、不超过供应上限
export async function POST(request: NextRequest) {
  try {
    const { to, amount } = await request.json();

    if (!to || !amount) {
      return NextResponse.json(
        { error: "Missing 'to' or 'amount' in request body" },
        { status: 400 }
      );
    }

    const contract = getWriteContract();
    const tx = await contract.mint(to, parseEther(amount));
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (err: any) {
    console.error("Mint error:", err);
    return NextResponse.json(
      { error: err.message || "Transaction failed" },
      { status: 500 }
    );
  }
}
