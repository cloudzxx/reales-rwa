# ── 构建阶段：用 uv 快速安装依赖 ──
FROM python:3.12-slim AS builder
WORKDIR /app

RUN pip install uv --no-cache-dir

COPY pyproject.toml .
RUN uv pip install --system --no-cache -r pyproject.toml

# ── 运行阶段：仅复制已安装的包，不携带 uv ──
FROM python:3.12-slim
WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages

COPY . .
ENV RPC_URL=http://hardhat:8545
EXPOSE 8000
CMD ["python", "main.py"]
