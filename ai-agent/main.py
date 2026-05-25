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
    rpc_url=os.getenv("RPC_URL", "http://127.0.0.1:8545"),
    solana_rpc_url=os.getenv("SOLANA_RPC_URL", "http://127.0.0.1:8899"),
)


class AnalyzeRequest(BaseModel):
    address: HexAddress
    contract_address: HexAddress


class SolanaAnalyzeRequest(BaseModel):
    address: SolAddress
    contract_address: str = ""


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze/address")
async def analyze_address(req: AnalyzeRequest):
    report = await agent.analyze(req.address, req.contract_address)
    return report


@app.post("/analyze/solana")
async def analyze_solana(req: SolanaAnalyzeRequest):
    report = await agent.analyze_solana(req.address)
    return report


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
