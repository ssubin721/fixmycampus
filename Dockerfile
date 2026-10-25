# FixMyCampus Production Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install app dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev

# Copy source code
WORKDIR /app
COPY backend ./backend
COPY frontend ./frontend
COPY database ./database

# Create uploads directory
RUN mkdir -p /app/backend/uploads

# Expose server port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

WORKDIR /app/backend
CMD ["node", "server.js"]
