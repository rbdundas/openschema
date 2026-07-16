# Stage 1: Build the client assets using Webpack
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

# Set env to production
ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --only=production

# Copy built dist files
COPY --from=builder /app/dist ./dist

# Copy server assets
COPY --from=builder /app/server ./server

# Copy database templates (contains workbench.json)
COPY --from=builder /app/data ./data

EXPOSE 8080

CMD ["node", "server/index.js"]
