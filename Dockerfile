# Multi-Stage Dockerfile para SAGAS ERP Backend & Admin
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências necessárias para Prisma e compilação nativa
RUN apk add --no-cache openssl

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências e gerar client Prisma
RUN npm ci --legacy-peer-deps
RUN npx prisma generate

# Copiar o restante do código-fonte
COPY . .

# Build do frontend administrativo Vite
RUN npm run build

# Stage 2: Runtime de Produção
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache openssl curl

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server /app/server
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

EXPOSE 3001

# Healthcheck do container
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["npx", "tsx", "server/index.ts"]
