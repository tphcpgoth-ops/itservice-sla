# ==========================================
# Stage 1: Build Frontend (Vite + React)
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /build/frontend

# Install frontend dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build static bundle
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Runner (Node.js Express)
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app/backend

# Set production environment
ENV NODE_ENV=production
ENV PORT=8008

# Install backend dependencies (production only)
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source code
COPY backend/ ./

# Copy built frontend assets from builder stage into /app/frontend/dist
COPY --from=frontend-builder /build/frontend/dist /app/frontend/dist

# Ensure uploads directory exists
RUN mkdir -p /app/backend/uploads

# Expose web server port
EXPOSE 8008

# Start the server
CMD ["node", "server.js"]
