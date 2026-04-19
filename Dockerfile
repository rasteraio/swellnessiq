FROM node:20-alpine AS base
WORKDIR /app

# ── Install all workspace dependencies ───────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=apps/api --workspace=packages/shared

# ── Build shared types package ────────────────────────────────────────────────
FROM deps AS build
COPY packages/shared ./packages/shared
RUN npm run build --workspace=packages/shared

# Copy and build API
COPY apps/api ./apps/api
RUN npm run build --workspace=apps/api

# ── Production image ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Production deps only
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=apps/api --workspace=packages/shared --omit=dev

# Built output
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist

# Prisma schema (needed for client generation + migrate deploy)
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && npx prisma generate

EXPOSE 3001

CMD ["sh", "-c", "cd apps/api && npx prisma db push --accept-data-loss && node dist/index.js"]
