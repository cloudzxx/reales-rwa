import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import ComplianceAgent

app = FastAPI(title="RWA Compliance Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = ComplianceAgent(
    rpc_url=os.getenv("RPC_URL", "http://127.0.0.1:8545")
)


class AnalyzeRequest(BaseModel):
    address: str
    contract_address: str


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze/address")
async def analyze_address(req: AnalyzeRequest):
    report = await agent.analyze(req.address, req.contract_address)
    return report


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
