FROM oven/bun:latest

WORKDIR /app

COPY package.json ./
COPY bun.lock ./
RUN bun install

COPY data ./data
COPY routes ./routes
COPY services ./services
COPY db ./db
COPY index.ts ./
COPY .env ./

EXPOSE 3000

CMD ["bun", "run", "index.ts"]
