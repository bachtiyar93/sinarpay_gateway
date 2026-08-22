# Multi-stage build for NestJS backend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies
RUN npm ci
RUN cd apps/backend && npm ci

# Copy source code
COPY . .

# Build the application
RUN cd apps/backend && npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install only production dependencies
RUN npm ci --omit=dev
RUN cd apps/backend && npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
WORKDIR /app/apps/backend
CMD ["npm", "run", "start:prod"]
