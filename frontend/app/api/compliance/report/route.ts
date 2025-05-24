import { NextRequest, NextResponse } from "next/server";

const AI_AGENT_URL = process.env.AI_AGENT_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: "Missing 'address' in request body" },
        { status: 400 }
      );
    }

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
