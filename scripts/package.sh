#!/usr/bin/env bash
set -e

NAME="reales-rwa"
VERSION=$(date +%Y%m%d_%H%M%S)
OUT_DIR="/tmp/${NAME}_${VERSION}"
OUTPUT="/tmp/${NAME}_${VERSION}.tar.gz"

echo "=== 保存 Docker 镜像 ==="
mkdir -p "${OUT_DIR}/images"

for img in reales-rwa-hardhat reales-rwa-deploy reales-rwa-frontend reales-rwa-ai-agent; do
  echo "  → ${img}"
  docker save "${img}:latest" | gzip > "${OUT_DIR}/images/${img}.tar.gz"
done

echo ""
echo "=== 复制配置文件 ==="
cp docker-compose.yml "${OUT_DIR}/"
cp .env.example "${OUT_DIR}/.env"

echo ""
echo "=== 创建部署包 ==="
cd /tmp
tar czf "${OUTPUT}" -C "${OUT_DIR}" .
echo ""
echo "部署包大小: $(du -h "${OUTPUT}" | cut -f1)"
echo ""
echo "=== 清理临时文件 ==="
rm -rf "${OUT_DIR}"

echo ""
echo "========== 部署到服务器 =========="
echo ""
echo "# 1. 上传"
echo "scp ${OUTPUT} root@your-server:/tmp/"
echo ""
echo "# 2. 服务器上解压"
echo "ssh root@your-server"
echo "mkdir -p ~/reales-rwa && tar xzf ${OUTPUT} -C ~/reales-rwa"
echo ""
echo "# 3. 加载镜像"
echo "cd ~/reales-rwa"
echo 'for f in images/*.tar.gz; do docker load -i "$f"; done'
echo ""
echo "# 4. 配置环境变量"
echo "cp .env .env.local  # 编辑 DEEPSEEK_API_KEY 等"
echo ""
echo "# 5. 启动"
echo "docker compose up -d"
echo ""
echo "================================="