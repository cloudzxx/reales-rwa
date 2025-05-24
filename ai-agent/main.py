import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, AfterValidator
from typing import Annotated
import re
from agent import ComplianceAgent

ETH_ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")

def validate_address(v: str) -> str:
    if not ETH_ADDRESS_RE.match(v):
        raise ValueError(f"Invalid Ethereum address: {v}")
    return v

HexAddress = Annotated[str, AfterValidator(validate_address)]

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
    address: HexAddress
    contract_address: HexAddress


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
