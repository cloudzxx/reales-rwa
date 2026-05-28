# ── Stage 1: 构建 ──
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile --registry=https://registry.npmmirror.com --config.ignore-scripts=true --config.minimumReleaseAge=0
RUN pnpm rebuild keccak

COPY . .

# 占位文件：让 next build 在部署文件就绪前也能通过
RUN mkdir -p lib && \
    echo 'export const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";' > lib/deployment.ts && \
    echo 'export const CONTRACT_ABI = [] as const;' > lib/abi.ts

RUN rm -rf node_modules/.cache && npx next build

# ── Stage 2: 运行（仅 standalone 产物）──
FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/.next/standalone /app
COPY --from=builder /app/.next/static /app/.next/static

# 用于运行时动态 import("@/lib/deployment") 的占位文件
# entrypoint.sh 会从 /generated/ 覆盖为真实值
RUN mkdir -p /app/lib && \
    echo 'export const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";' > /app/lib/deployment.ts && \
    echo 'export const CONTRACT_ABI = [] as const;' > /app/lib/abi.ts

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
