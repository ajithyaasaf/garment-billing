# ==========================================
# STAGE 1: Build Stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma Client & Build TypeScript
RUN npx prisma generate
RUN npm run build

# Remove development dependencies to keep image size small
RUN npm prune --production

# ==========================================
# STAGE 2: Runner Stage (Production)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
# Hugging Face default port is 7860
ENV PORT=7860

# Copy built app and production dependencies from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose port 7860
EXPOSE 7860

# Command to start the backend application
CMD ["node", "dist/index.js"]
