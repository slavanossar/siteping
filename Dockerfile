# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM base AS migrate-deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts

FROM base AS builder
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="postgresql://siteping:build@postgres:5432/siteping"
ENV SITEPING_API_KEY="build-time-placeholder"
ENV SITEPING_ADMIN_PASSWORD="build-time-placeholder"
ENV SITEPING_SESSION_SECRET="build-time-placeholder"

RUN npm run build

FROM base AS runner
RUN apk add --no-cache libc6-compat wget
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated
COPY --from=migrate-deps /app/node_modules ./migrate_modules
COPY --from=builder /app/node_modules/@prisma/adapter-pg ./node_modules/@prisma/adapter-pg
COPY --from=builder /app/node_modules/pg ./node_modules/pg
COPY --from=builder /app/node_modules/pg-cloudflare ./node_modules/pg-cloudflare
COPY --from=builder /app/node_modules/pg-connection-string ./node_modules/pg-connection-string
COPY --from=builder /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=builder /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=builder /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=builder /app/node_modules/pgpass ./node_modules/pgpass
COPY --from=builder /app/node_modules/postgres-array ./node_modules/postgres-array
COPY --from=builder /app/node_modules/postgres-bytea ./node_modules/postgres-bytea
COPY --from=builder /app/node_modules/postgres-date ./node_modules/postgres-date
COPY --from=builder /app/node_modules/postgres-interval ./node_modules/postgres-interval
COPY --from=builder /app/node_modules/split2 ./node_modules/split2
COPY --from=builder /app/node_modules/xtend ./node_modules/xtend
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
