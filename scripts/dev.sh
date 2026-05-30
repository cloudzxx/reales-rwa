#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EVM_DIR="$ROOT_DIR/contracts/evm"
FRONTEND_DIR="$ROOT_DIR/frontend"
AI_DIR="$ROOT_DIR/ai-agent"

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$HH_PID" ] && kill "$HH_PID" 2>/dev/null || true
  [ -n "$AI_PID" ] && kill "$AI_PID" 2>/dev/null || true
  [ -n "$FE_PID" ] && kill "$FE_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "=== Starting Hardhat node ==="
cd "$EVM_DIR" && npx hardhat node &
HH_PID=$!
sleep 3

echo ""
echo "=== Deploying contracts ==="
cd "$EVM_DIR" && npx hardhat run scripts/deploy.js --network localhost
echo ""

echo "=== Starting AI Agent ==="
cd "$AI_DIR" && python3 main.py &
AI_PID=$!
sleep 2
echo "AI Agent running on http://127.0.0.1:8000"
echo ""

echo "=== Starting Next.js frontend ==="
cd "$FRONTEND_DIR" && npx next dev &
FE_PID=$!
sleep 3
echo ""

echo "============================================"
echo "  All services started!"
echo "  Frontend:     http://localhost:3000"
echo "  AI Agent:     http://localhost:8000"
echo "  Hardhat RPC:  http://localhost:8545"
echo ""
echo "  Press Ctrl+C to stop all services."
echo "============================================"

wait
