FROM oven/bun:latest

WORKDIR /app

RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && rm -rf /var/lib/apt/lists/*

COPY api/package.json ./
RUN bun install

COPY api/ ./

COPY ml/ ./ml/
RUN python3 -m venv ml_env && \
    ml_env/bin/pip install --no-cache-dir scikit-learn joblib pandas numpy requests

ENV ML_ENV_PYTHON=/app/ml_env/bin/python

EXPOSE 3000

CMD ["bun", "run", "index.ts"]