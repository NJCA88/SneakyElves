#!/bin/sh
# Start the API immediately. This runs on every cold start, so it must stay fast.
#
# Database schema changes are NOT applied here anymore. When prisma/schema.prod.prisma
# changes, run this once from a machine that has the production DATABASE_URL:
#
#   DATABASE_URL="<neon connection string>" npm run db:sync
#
# (db:sync refuses changes that would delete data, instead of silently dropping it.)
exec node index.js
