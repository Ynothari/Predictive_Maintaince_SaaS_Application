FROM node:24-slim

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY backend/ .

EXPOSE 8001

CMD ["npx", "tsx", "src/index.ts"]
