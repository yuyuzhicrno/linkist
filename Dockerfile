# Frontend build stage
FROM node:20-alpine AS frontend
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Backend production stage
FROM node:20-alpine AS backend
WORKDIR /app/server

# Install dependencies
COPY server/package*.json ./
RUN npm ci --production

# Copy source code
COPY server/ ./

# Copy built frontend
COPY --from=frontend /app/client/dist ./client/dist

# Create data directory
RUN mkdir -p ./data

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "index.js"]
