# Use official Node.js image
FROM node:22-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY prisma/schema.prod.prisma ./prisma/schema.prisma
COPY prisma/migrations_prod ./prisma/migrations
COPY prisma/seed.js ./prisma/seed.js

# Generate Prisma client
# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start command (start server immediately, run migrations async)
# Copy start script
COPY start.sh ./
RUN chmod +x start.sh

# Start command
CMD ["./start.sh"]
