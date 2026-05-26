#!/usr/bin/env bash
set -e

NAME="reales-rwa"
VERSION=$(date +%Y%m%d_%H%M%S)
OUTPUT="${NAME}_${VERSION}.tar.gz"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== 编译合约（生成 artifacts）==="
cd "$ROOT_DIR/contracts" && npx hardhat compile 2>&1 | tail -1

echo "=== 创建部署包 ${OUTPUT} ==="
cd "$ROOT_DIR"

tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.venv' \
    --exclude='venv' \
    --exclude='.git' \
    --exclude='target' \
    --exclude='pnpm-lock.yaml' \
    -czf "/tmp/${OUTPUT}" \
    docker-compose.yml \
    .env.example \
    contracts/package.json \
    contracts/hardhat.config.js \
    contracts/Dockerfile \
    contracts/Dockerfile.deploy \
    contracts/contracts/ \
    contracts/scripts/ \
    contracts/artifacts/ \
    contracts/cache/ \
    frontend/package.json \
    frontend/next.config.mjs \
    frontend/tsconfig.json \
    frontend/tailwind.config.ts \
    frontend/postcss.config.mjs \
    frontend/Dockerfile \
    frontend/entrypoint.sh \
    frontend/.dockerignore \
    frontend/.env.example \
    frontend/app/ \
    frontend/lib/ \
    ai-agent/Dockerfile \
    ai-agent/main.py \
    ai-agent/agent.py \
    ai-agent/requirements.txt \
    ai-agent/.env.example

echo "=== 部署包创建完成 ==="
echo "文件: /tmp/${OUTPUT}"
echo "大小: $(du -h /tmp/${OUTPUT} | cut -f1)"
echo ""
echo "=== 上传到服务器 ==="
echo "scp /tmp/${OUTPUT} user@your-server:/tmp/"
echo ""
echo "=== 在服务器上解压运行 ==="
echo "ssh user@your-server"
echo "mkdir -p ~/reales-rwa && tar xzf /tmp/${OUTPUT} -C ~/reales-rwa"
echo "cd ~/reales-rwa && cp .env.example .env"
echo "docker compose up -d --build"
