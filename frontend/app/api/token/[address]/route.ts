import { NextRequest, NextResponse } from "next/server";
import { getReadContract } from "@/lib/contract";
import { formatEther } from "ethers";

// GET /api/token/[address]  —  查询地址详情
// 返回：余额、白名单状态、冻结状态，以及最近 20 条 Transfer 事件
// 通过过滤合约事件，筛选出该地址作为发送方或接收方的记录
export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const contract = getReadContract();
    const bal = await contract.balanceOf(params.address);
    const whitelisted = await contract.whitelist(params.address);
    const isFrozen = await contract.frozen(params.address);

    // 获取合约所有 Transfer 事件，按地址过滤
    const filter = contract.filters.Transfer();
    const events = await contract.queryFilter(filter, 0);

    const transfers = events
      .filter((e: any) => {
        // e.args[0] = 发送方, e.args[1] = 接收方
        return (
          e.args[0].toLowerCase() === params.address.toLowerCase() ||
          e.args[1].toLowerCase() === params.address.toLowerCase()
        );
      })
      // 只保留最近 20 条
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
