# syntax=docker/dockerfile:1.7

# ─── Builder ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Native deps for some npm packages on Alpine
RUN apk add --no-cache libc6-compat

# Install deps with cached layer
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

# Copy source and build
COPY . .

# Next.js telemetry off in CI / self-host
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Runner ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S filey && adduser -S filey -u 1001 -G filey

# Copy built output
COPY --from=builder --chown=filey:filey /app/public ./public
COPY --from=builder --chown=filey:filey /app/.next ./.next
COPY --from=builder --chown=filey:filey /app/node_modules ./node_modules
COPY --from=builder --chown=filey:filey /app/package.json ./package.json

USER filey
EXPOSE 3000

# Health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["npm", "run", "start"]
