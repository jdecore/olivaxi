FROM oven/bun:latest

WORKDIR /app

COPY api/package.json ./
COPY api/bun.lock ./
RUN bun install

COPY api/ .

EXPOSE 3000

CMD ["bun", "run", "index.ts"]
