FROM node:20-alpine AS base
WORKDIR /app

# ── Install all workspace dependencies ───────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=apps/api --workspace=packages/shared

# ── Build stage ───────────────────────────────────────────────────────────────
FROM deps AS build

# Build shared types first
COPY packages/shared ./packages/shared
RUN npm run build --workspace=packages/shared

# Copy API source + Prisma schema
COPY apps/api ./apps/api

# Generate Prisma client BEFORE tsc so the types are available for compilation
RUN cd apps/api && npx prisma generate

# Now compile the API
RUN npm run build --workspace=apps/api

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Production deps only
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=apps/api --workspace=packages/shared --omit=dev

# Shared built output
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

# API built output
COPY --from=build /app/apps/api/dist ./apps/api/dist

# Prisma schema + re-generate client in runner (works regardless of workspace layout)
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && npx prisma generate

COPY apps/api/entrypoint.sh ./apps/api/entrypoint.sh
RUN chmod +x ./apps/api/entrypoint.sh

EXPOSE 3001

CMD ["/app/apps/api/entrypoint.sh"]
