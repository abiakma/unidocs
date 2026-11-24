# UniDocs: one container serves the React app and the REST API from the same origin.
# Build: docker build -t unidocs .   (Render builds this file itself; Docker is not needed locally)

# ---------- Build stage ----------
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies first so Docker can cache this layer.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
# Placeholder only: prisma generate reads the config but does not connect.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npm ci

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=node:node /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/web/dist ./apps/web/dist
COPY --chown=node:node docker-start.sh ./docker-start.sh

ENV PORT=3000 \
    WEB_DIST_DIR=/app/apps/web/dist \
    STORAGE_DIR=/app/apps/api/storage
RUN mkdir -p /app/apps/api/storage && chown node:node /app/apps/api/storage

USER node
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "/app/docker-start.sh"]
