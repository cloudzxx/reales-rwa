FROM python:3.12-slim
WORKDIR /app

# uv: pip 的 10-100x 加速替代
RUN pip install uv --no-cache-dir

# 利用 Docker 缓存层：仅当 pyproject.toml 变化时才重装依赖
COPY pyproject.toml .
RUN uv pip install --system --no-cache -r pyproject.toml

COPY . .
ENV RPC_URL=http://hardhat:8545
EXPOSE 8000
CMD ["python", "main.py"]
