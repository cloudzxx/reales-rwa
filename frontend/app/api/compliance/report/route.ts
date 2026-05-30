import { NextRequest, NextResponse } from "next/server";

const AI_AGENT_URL = process.env.AI_AGENT_URL || "http://127.0.0.1:8000";
const AI_AGENT_TIMEOUT = 120_000;

export async function POST(request: NextRequest) {
  try {
    const { address, chain, rpc_url, contract_address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: "Missing 'address' in request body" },
        { status: 400 }
      );
    }

    const endpoint = chain === "solana" ? "/analyze/solana" : "/analyze/address";

    const { CONTRACT_ADDRESS } = await import("@/lib/deployment");

    const body: any = { address, contract_address: contract_address || CONTRACT_ADDRESS };
    if (rpc_url) body.rpc_url = rpc_url;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_AGENT_TIMEOUT);

    const res = await fetch(`${AI_AGENT_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

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
    if (err.name === "AbortError") {
      return NextResponse.json({ error: "AI Agent timed out" }, { status: 504 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to get compliance report" },
      { status: 500 }
    );
  }
}

