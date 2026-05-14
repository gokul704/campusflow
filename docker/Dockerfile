# syntax=docker/dockerfile:1
# Multi-target image for Campusflow (Turborepo): `api` (Express) and `web` (Next.js standalone).

FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
# `package*.json` picks up `package-lock.json` when present; some VPS clones omit the lockfile.
COPY package*.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
# Root `postinstall` runs `prisma generate` before the Prisma schema exists in this layer.
RUN if [ -f package-lock.json ]; then npm ci --ignore-scripts; else npm install --ignore-scripts; fi

FROM deps AS builder
COPY . .
# `prisma generate` / Next collect may read env; real URLs are only required at runtime for the API.
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/campusflow"
ENV DIRECT_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/campusflow"
ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_APP_DOMAIN=localhost:3000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_DOMAIN=${NEXT_PUBLIC_APP_DOMAIN}
RUN npm run build

FROM base AS api
ENV NODE_ENV=production
RUN npm install -g prisma@6.19.2
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY docker/api-entrypoint.sh /app/api-entrypoint.sh
RUN chmod +x /app/api-entrypoint.sh
EXPOSE 4000
ENTRYPOINT ["/app/api-entrypoint.sh"]

FROM base AS web
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
