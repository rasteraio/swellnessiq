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

# API built output + generated Prisma client
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Prisma schema (needed for migrate/push at runtime)
COPY apps/api/prisma ./apps/api/prisma

EXPOSE 3001

CMD ["sh", "-c", "cd apps/api && npx prisma db push --accept-data-loss && node dist/index.js"]
