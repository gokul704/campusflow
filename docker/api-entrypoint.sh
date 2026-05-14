#!/bin/sh
set -e
if [ -z "${SKIP_MIGRATE}" ]; then
  prisma migrate deploy --schema=/app/packages/db/prisma/schema.prisma
fi
exec node /app/apps/api/dist/index.js
