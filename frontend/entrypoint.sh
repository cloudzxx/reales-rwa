#!/bin/sh
set -e

# Copy generated deployment files from shared volume
if [ -f /generated/deployment.ts ]; then
  cp /generated/deployment.ts /app/lib/deployment.ts
  cp /generated/abi.ts /app/lib/abi.ts
  echo "Deployment files copied from /generated/"
fi

exec npx next dev -p 3000
