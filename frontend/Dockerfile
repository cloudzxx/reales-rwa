FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile --registry=https://registry.npmmirror.com --config.ignore-scripts=true
RUN pnpm rebuild keccak
COPY . .
RUN rm -rf node_modules/.cache && mkdir -p lib
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
