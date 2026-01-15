---
description: How to deploy the Almadle application to a production server
---

# Deploying Almadle

This guide explains how to deploy the Almadle game to your server.

## Option 1: Standard Node.js Deployment

Prerequisites: Node.js 18+ installed on your server.

1.  **Transfer Code**: Clone the repository or copy files to your server.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Build the Application**:
    ```bash
    npm run build
    ```
4.  **Start the Server**:
    ```bash
    npm start
    ```
    The app will run on port 3000 by default. You can use a process manager like `pm2` to keep it running:
    ```bash
    npx pm2 start npm --name "almadle" -- start
    ```

## Option 2: Docker Deployment

If you prefer using Docker, follow these steps.

1.  **Create a Dockerfile**:
    Run this command to create a production-ready Dockerfile:
    
    ```bash
    cat <<EOF > Dockerfile
    FROM node:18-alpine AS base

    # Install dependencies only when needed
    FROM base AS deps
    # Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
    RUN apk add --no-cache libc6-compat
    WORKDIR /app

    COPY package.json package-lock.json ./
    RUN npm ci

    # Rebuild the source code only when needed
    FROM base AS builder
    WORKDIR /app
    COPY --from=deps /app/node_modules ./node_modules
    COPY . .

    # Disable telemetry during the build.
    ENV NEXT_TELEMETRY_DISABLED 1

    RUN npm run build

    # Production image, copy all the files and run next
    FROM base AS runner
    WORKDIR /app

    ENV NODE_ENV production
    ENV NEXT_TELEMETRY_DISABLED 1

    RUN addgroup --system --gid 1001 nodejs
    RUN adduser --system --uid 1001 nextjs

    COPY --from=builder /app/public ./public

    # Set the correct permission for prerender cache
    RUN mkdir .next
    RUN chown nextjs:nodejs .next

    # Automatically leverage output traces to reduce image size
    # https://nextjs.org/docs/advanced-features/output-file-tracing
    COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
    COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

    USER nextjs

    EXPOSE 3000

    ENV PORT 3000
    
    # set hostname to localhost
    ENV HOSTNAME "0.0.0.0"

    CMD ["node", "server.js"]
    EOF
    ```

2.  **Configure next.config.ts**:
    For the Dockerfile above to work (standalone mode), you need to update `next.config.ts`:
    
    ```typescript
    import type { NextConfig } from "next";

    const nextConfig: NextConfig = {
      output: "standalone",
    };

    export default nextConfig;
    ```
    
    *Run this command to update it automatically:*
    ```bash
    sed -i '' 's/const nextConfig: NextConfig = {/const nextConfig: NextConfig = {\n  output: "standalone",/' next.config.ts
    ```

3.  **Build and Run**:
    ```bash
    docker build -t almadle .
    docker run -p 3000:3000 almadle
    ```
