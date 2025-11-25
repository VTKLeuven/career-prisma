# Use the official Node.js runtime as the base image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Install dependencies for canvas, sharp, and pdf libraries
RUN apk add --no-cache libc6-compat \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    python3 \
    make \
    g++
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
# Install build dependencies for native modules
RUN apk add --no-cache \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    python3 \
    make \
    g++
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

# Accept build args for environment variables needed during build
# These are only used during build and won't be in the final image
ARG DIRECTUS_URL=http://localhost:8055
ENV DIRECTUS_URL=$DIRECTUS_URL

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

# Install runtime dependencies for canvas and sharp
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman

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
CMD ["node", "server.js"]

