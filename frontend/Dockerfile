# ── Stage 1: 构建 ──
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile --registry=https://registry.npmmirror.com --config.ignore-scripts=true --config.minimumReleaseAge=0
RUN pnpm rebuild keccak

ARG CACHEBUST
RUN echo "build $CACHEBUST"

COPY . .

RUN rm -rf node_modules/.cache && npx next build

# ── Stage 2: 运行（仅 standalone 产物）──
FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/.next/standalone /app
COPY --from=builder /app/.next/static /app/.next/static
COPY --from=builder /app/lib /app/lib

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
