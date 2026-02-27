# ── Stage 1: deps + build ────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace config
COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/
# Client package.json needed for npm workspaces resolution
COPY packages/client/package.json ./packages/client/

# Install server deps via workspace (skips client's heavy frontend deps)
RUN npm ci --workspace=packages/server --ignore-scripts

# Copy server source + prisma
COPY packages/server ./packages/server

# Generate Prisma client (postgresql)
RUN cd packages/server && npx prisma generate

# Compile TypeScript → dist/
RUN cd packages/server && npx tsc --project tsconfig.json

# ── Stage 2: lean runtime image ───────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

RUN npm ci --workspace=packages/server --omit=dev --ignore-scripts

# Copy compiled output + prisma schema + migrations
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/prisma ./packages/server/prisma
# Copy generated prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

ENV NODE_ENV=production
WORKDIR /app/packages/server
EXPOSE 4000

# Migrate then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
