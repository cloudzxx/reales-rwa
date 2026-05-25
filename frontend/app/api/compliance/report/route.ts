import { NextRequest, NextResponse } from "next/server";

// Python AI Agent 微服务的地址（可通过环境变量覆盖）
const AI_AGENT_URL = process.env.AI_AGENT_URL || "http://127.0.0.1:8000";

// POST /api/compliance/report  —  代理转发到 AI 合规分析 Agent
// 请求体: { address: string }
// 将请求转发到 Python FastAPI 服务的 /analyze/address 端点
// 该服务会拉取链上数据，并通过 LLM 进行风险评估
export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: "Missing 'address' in request body" },
        { status: 400 }
      );
    }

    // 动态导入 deployment.ts，确保运行时可获取合约地址
    const { CONTRACT_ADDRESS } = await import("@/lib/deployment");

    const res = await fetch(`${AI_AGENT_URL}/analyze/address`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, contract_address: CONTRACT_ADDRESS }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `AI Agent error: ${text}` },
        { status: 502 }
      );
    }

    // 将 AI Agent 的响应直接返回给前端
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Compliance report error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get compliance report" },
      { status: 500 }
    );
  }
}
