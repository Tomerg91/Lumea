# Railway Dockerfile for SatyaCoaching Server
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../shared ./shared

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start the application using tsx
CMD ["npx", "tsx", "src/index.ts"]