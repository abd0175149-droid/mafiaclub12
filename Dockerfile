FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY server.ts ./
COPY server/ ./server/
COPY google-service-account.json* ./
RUN mkdir -p data
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npx", "tsx", "server.ts"]
