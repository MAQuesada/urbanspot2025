# Multi-stage build for Angular frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY angular.json ./
COPY tsconfig.json ./
COPY tsconfig.app.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build the application (API_KEY will be loaded at runtime from config.json)
RUN npm run build

# Production stage
FROM nginx:alpine

# Install curl for health checks (optional)
RUN apk add --no-cache curl

# Copy built files
COPY --from=builder /app/dist/urbanspot/browser /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create assets directory if it doesn't exist
RUN mkdir -p /usr/share/nginx/html/assets

# Expose port
EXPOSE 80

# Use entrypoint script to generate config.json from environment variables
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
