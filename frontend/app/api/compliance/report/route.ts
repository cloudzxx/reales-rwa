import { NextRequest, NextResponse } from "next/server";

// URL of the Python AI Agent microservice (overridable via env var)
const AI_AGENT_URL = process.env.AI_AGENT_URL || "http://127.0.0.1:8000";

// POST /api/compliance/report  —  Proxy to the AI Compliance Agent
// Body: { address: string }
// Forwards the request to the Python FastAPI service at /analyze/address,
// which fetches on-chain data and runs LLM-powered risk analysis
export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: "Missing 'address' in request body" },
        { status: 400 }
      );
    }

    // Dynamic import ensures deployment.ts is loaded at runtime, not build time
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

    // Forward the AI agent's response directly back to the frontend
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
