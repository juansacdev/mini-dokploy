FROM node:22-alpine AS builder

# better-sqlite3 is a native module → needs a toolchain to compile on alpine
RUN apk add --no-cache python3 make g++

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-alpine as runner

# Mini-Dokploy shells out to `docker` and `git` from inside the container.
RUN apk add --no-cache docker-cli git

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000

# Run migrations against the (volume-mounted) DB, then start Next.
CMD ["sh", "-c", "node scripts/migrate.mjs && node_modules/.bin/next start"]
