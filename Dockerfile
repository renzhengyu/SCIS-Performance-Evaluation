# Stage 1: Build Next.js app
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Use fast China npm mirror for Aliyun Shanghai
RUN npm config set registry https://registry.npmmirror.com

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Copy application files
COPY . .

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

# Stage 2: Production runner with Headless Chrome & Chinese Fonts for Puppeteer
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Configure Aliyun mirrors for Debian Bookworm (Debian 12)
RUN if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
      sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources; \
    fi; \
    if [ -f /etc/apt/sources.list ]; then \
      sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list; \
      sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list; \
    fi

# Install Chromium and Chinese fonts with Check-Valid-Until=false to avoid expiration issues
RUN apt-get -o Acquire::Check-Valid-Until=false update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-wqy-zenhei \
    fonts-wqy-microhei \
    fonts-noto-cjk \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Automatically sync DB schema and seed initial super admin on startup, then start app
CMD ["sh", "-c", "npx prisma db push && npx tsx prisma/seed.ts && npm run start"]
