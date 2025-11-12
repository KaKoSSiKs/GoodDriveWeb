# Production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Установка зависимостей для Prisma
RUN apk add --no-cache openssl

# Копируем package files
COPY package*.json ./

# Устанавливаем ВСЕ зависимости (включая dev для сборки)
RUN npm install --legacy-peer-deps

# Копируем Prisma схему
COPY prisma ./prisma/

# Генерируем Prisma Client
RUN npm run prisma:generate

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Удаляем dev-зависимости и чистим кеш
RUN npm prune --production --legacy-peer-deps && npm cache clean --force

# Production image
FROM node:20-alpine

WORKDIR /app

# Устанавливаем openssl для Prisma
RUN apk add --no-cache openssl

# Копируем зависимости и build из builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma

# Создаем пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Меняем владельца файлов
RUN chown -R nodejs:nodejs /app

USER nodejs

# Открываем порт
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Запуск приложения
CMD ["node", "build/index.js"]

