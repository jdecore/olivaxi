FROM oven/bun:latest

WORKDIR /app

COPY api/package.json ./
COPY api/bun.lock ./
RUN bun install

COPY api/data ./data
COPY api/routes ./routes
COPY api/services ./services
COPY api/db ./db
COPY api/index.ts ./

EXPOSE 3000

CMD ["bun", "run", "index.ts"]
