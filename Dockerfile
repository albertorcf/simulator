# Etapa 1: Instalação de dependências e build
FROM node:20-alpine AS builder
WORKDIR /app

# Copia apenas arquivos essenciais do monorepo
COPY ../../pnpm-workspace.yaml ../../pnpm-lock.yaml ./
COPY ../../package.json ./
COPY . .

# Instala pnpm globalmente
RUN npm install -g pnpm

# Instala dependências do monorepo e do app
RUN pnpm install --frozen-lockfile

# Desabilita ESLint no build do Next.js temporariamente
ENV NEXT_DISABLE_ESLINT_PLUGIN=1

# Build apenas do app Next.js (sem dependências)
RUN pnpm --filter simulator build

# Etapa 2: Imagem de produção
FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm

# Copia todo o workspace e dependências
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/simulator ./apps/simulator

# Muda para o diretório do app
WORKDIR /app/apps/simulator

EXPOSE 3000
ENV NODE_ENV=production

CMD ["pnpm", "start"]
