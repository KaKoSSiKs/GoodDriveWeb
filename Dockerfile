# Production Dockerfile для SvelteKit + Prisma + MySQL
# Multi-stage build для оптимизации размера образа

# ==================== Stage 1: Builder ====================
FROM node:20-alpine AS builder

WORKDIR /app

# Установка зависимостей для Prisma на Alpine
RUN apk add --no-cache openssl libc6-compat

# ARG для переменных окружения, нужных во время сборки (для SvelteKit PUBLIC_* переменные)
ARG PUBLIC_SITE_URL
ARG PUBLIC_YM_COUNTER_ID
ARG PUBLIC_GA4_ID
ARG PUBLIC_GOOGLE_VERIFICATION
ARG PUBLIC_YANDEX_VERIFICATION

# Устанавливаем переменные окружения для сборки
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL}
ENV PUBLIC_YM_COUNTER_ID=${PUBLIC_YM_COUNTER_ID}
ENV PUBLIC_GA4_ID=${PUBLIC_GA4_ID}
ENV PUBLIC_GOOGLE_VERIFICATION=${PUBLIC_GOOGLE_VERIFICATION}
ENV PUBLIC_YANDEX_VERIFICATION=${PUBLIC_YANDEX_VERIFICATION}
ENV NODE_ENV=production

# Копируем package files (package.json и package-lock.json)
# package-lock.json нужен для npm ci
COPY package.json ./
COPY package-lock.json ./

# Устанавливаем все зависимости (включая dev для сборки)
RUN npm ci --legacy-peer-deps

# Копируем Prisma схему
COPY prisma ./prisma/

# Генерируем Prisma Client (используем локально установленную версию)
RUN npm exec prisma generate

# Копируем исходный код
COPY . .

# Собираем приложение SvelteKit
RUN npm run build

# ==================== Stage 2: Production ====================
FROM node:20-alpine

WORKDIR /app

# Устанавливаем openssl для Prisma
RUN apk add --no-cache openssl libc6-compat

# Переменные окружения для production
ENV NODE_ENV=production
ENV PORT=3000

# Копируем package files и package-lock.json из builder
# (package-lock.json точно есть в builder после npm ci на строке 31)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Устанавливаем только production зависимости
RUN npm ci --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Копируем Prisma схему и CLI из builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Копируем сгенерированные файлы Prisma Client из builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Копируем собранное приложение
COPY --from=builder /app/build ./build

# Копируем CSV файл и скрипты для импорта данных
COPY db_of_catalog.csv ./db_of_catalog.csv
COPY scripts ./scripts

# Копируем static файлы (если есть)
COPY static ./static

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Открываем порт
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Запуск приложения
# Миграции и импорт данных выполняются через docker-compose command
CMD ["node", "build/index.js"]
