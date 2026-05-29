#!/bin/sh
set -e

if [ -f /generated/deployment.ts ]; then
  cp /generated/deployment.ts /app/lib/deployment.ts
  cp /generated/abi.ts /app/lib/abi.ts

  # 提取地址写入 JSON，绕开 Next.js 模块编译缓存
  ADDRESS=$(grep -o "0x[a-fA-F0-9]\{40\}" /generated/deployment.ts)
  echo "{\"address\":\"$ADDRESS\"}" > /app/lib/deployment.json
  echo "Deployment files copied from /generated/"
fi

exec node server.js
