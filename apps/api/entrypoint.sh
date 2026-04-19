#!/bin/sh
set -e
cd /app/apps/api

# Push schema to DB in background so the server can start immediately
# (healthcheck passes; by the time real traffic arrives the schema is ready)
npx prisma db push --accept-data-loss &

# Start the API server as the main process
exec node dist/index.js
