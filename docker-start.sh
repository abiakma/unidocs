#!/bin/sh
# Container start: apply migrations, load the fictional demo data, start the API.
set -e

/app/node_modules/.bin/prisma migrate deploy

# The seed only creates fictional roles, workflow and staff accounts and is safe to
# re-run (it uses upserts). It refuses to run when NODE_ENV=production.
if [ "${RUN_DEMO_SEED:-false}" = "true" ]; then
  /app/node_modules/.bin/tsx prisma/seed.ts
fi

exec node dist/main.js
