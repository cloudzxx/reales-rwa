import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, AfterValidator, Field
from typing import Annotated, Optional
import re
from agent import ComplianceAgent

ETH_ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")
SOL_ADDRESS_RE = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")

def validate_address(v: str) -> str:
    if not ETH_ADDRESS_RE.match(v):
        raise ValueError(f"Invalid Ethereum address: {v}")
    return v

def validate_solana_address(v: str) -> str:
    if not SOL_ADDRESS_RE.match(v):
        raise ValueError(f"Invalid Solana address: {v}")
    return v

HexAddress = Annotated[str, AfterValidator(validate_address)]
SolAddress = Annotated[str, AfterValidator(validate_solana_address)]

app = FastAPI(title="RWA Compliance Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = ComplianceAgent(
    rpc_url=os.getenv("RPC_URL", "https://ethereum-sepolia.publicnode.com"),
    solana_rpc_url=os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
)


class AnalyzeRequest(BaseModel):
    address: HexAddress
    contract_address: HexAddress
    rpc_url: str = ""


class SolanaAnalyzeRequest(BaseModel):
    address: SolAddress
    contract_address: str = ""


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze/address")
async def analyze_address(req: AnalyzeRequest):
    if req.rpc_url:
        # 使用外部 RPC 进行一次分析（限制最近 50000 个区块）
        external_agent = ComplianceAgent(
            rpc_url=req.rpc_url,
            solana_rpc_url=os.getenv("SOLANA_RPC_URL", "http://127.0.0.1:8899"),
        )
        report = await external_agent.analyze(req.address, req.contract_address, max_blocks=50000)
    else:
        report = await agent.analyze(req.address, req.contract_address)
    return report


@app.post("/analyze/solana")
async def analyze_solana(req: SolanaAnalyzeRequest):
    report = await agent.analyze_solana(req.address)
    return report


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
