FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS builder
ARG PUBLIC_API_URL
ENV PUBLIC_API_URL=${PUBLIC_API_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS runner
ENV NODE_ENV=production
ARG PUBLIC_API_URL
ENV PUBLIC_API_URL=$PUBLIC_API_URL
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.astro ./node_modules/.astro

EXPOSE 4321

CMD ["bun", "x", "astro", "preview", "--host", "0.0.0.0", "--port", "4321", "--dist", "dist", "--allowedHosts", "olivaxi.duckdns.org"]