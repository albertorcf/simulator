## Etapa 1: Instalação de dependências e build
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

# Gera o Prisma Client ANTES do build do Next.js
RUN pnpm --filter simulator exec prisma generate

# Desabilita ESLint no build do Next.js temporariamente
ENV NEXT_DISABLE_ESLINT_PLUGIN=1
# Build apenas do app Next.js
RUN pnpm --filter simulator build


## Etapa 2: Imagem de produção
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

# Gera o Prisma Client para a imagem de produção, caso seja necessário
# em tempo de execução ou se não for copiado da etapa de build.
RUN pnpm --filter simulator exec prisma generate
# O build do Next.js já foi feito na etapa 'builder' e os artefatos copiados.
# Estas linhas são provavelmente redundantes na etapa de produção.
# ENV NEXT_DISABLE_ESLINT_PLUGIN=1
# RUN pnpm --filter simulator build

EXPOSE 3000
ENV NODE_ENV=production

CMD ["pnpm", "start"]
