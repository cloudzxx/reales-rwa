#!/bin/sh
set -e

# Copy generated deployment files from shared volume
# （standalone 模式下 /app/lib/ 已存在于构建产物中，此处覆盖为真实值）
if [ -f /generated/deployment.ts ]; then
  cp /generated/deployment.ts /app/lib/deployment.ts
  cp /generated/abi.ts /app/lib/abi.ts
  echo "Deployment files copied from /generated/"
fi

exec node server.js
