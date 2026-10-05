# Use the official Node.js runtime as the base image
FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
# The native modules (argon2, sharp) ship prebuilt binaries; the compiler is
# only a fallback for a platform without one. No system libraries are needed
# since the canvas package went.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Prisma migration image. This keeps production imports independent of the
# host's Node/npm version while still using the repository's pinned lockfile.
FROM base AS migrator
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json prisma.config.ts ./
COPY prisma ./prisma
COPY scripts/run-prisma-migrations.mjs ./scripts/run-prisma-migrations.mjs
CMD ["node", "scripts/run-prisma-migrations.mjs"]

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1
# Prisma is instantiated while Next.js analyzes server modules. Static page
# generation does not query the database, but the client still requires a
# syntactically valid URL during the image build. Runtime Compose overrides it.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build

# Accept build args for environment variables needed during build
# NEXT_PUBLIC_* variables are baked into the client bundle at build time
# These come from docker-compose build args, which read from .env
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN

# "true" only on the dev deployment. The vacancy routes currently build as
# dynamic, so the runtime variable is what decides what visitors see; this build
# arg covers the case where one of them is prerendered instead, so it bakes in
# the right value rather than defaulting to production. Keep it equal to the
# runtime setting. Defaults to false: an image built without it is production.
ARG DEV_ENVIRONMENT=false
ENV DEV_ENVIRONMENT=$DEV_ENVIRONMENT

RUN npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
# Run native Node directly in the single Compose app container.
CMD ["node", "server.js"]
