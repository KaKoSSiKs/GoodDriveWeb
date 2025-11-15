# 📋 Переменные окружения - Полная документация

## Обзор

Все переменные окружения проекта описаны в `.env.example`. Этот файл содержит все необходимые переменные с комментариями и примерами.

## Категории переменных

### 1. Database Configuration

```env
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=gooddrive_db
MYSQL_USER=gooddrive_user
MYSQL_PASSWORD=gooddrive_password
DATABASE_URL=mysql://gooddrive_user:gooddrive_password@mysql:3306/gooddrive_db
```

**Использование:**
- `MYSQL_*` переменные используются в `docker-compose.yml` для настройки MySQL
- `DATABASE_URL` используется в Prisma (`prisma/schema.prisma`) и формируется автоматически в docker-compose

**Где используется:**
- `docker-compose.yml` - формирование DATABASE_URL
- `prisma/schema.prisma` - подключение к БД
- `src/lib/server/db.ts` - Prisma Client

### 2. Application Configuration

```env
NODE_ENV=production
PORT=3000
```

**Использование:**
- `NODE_ENV` - определяет режим работы (development/production)
- `PORT` - порт для приложения (по умолчанию 3000)

**Где используется:**
- `src/lib/server/db.ts` - логирование Prisma
- `src/lib/server/logger.ts` - уровень логирования
- `src/lib/server/error-handler.ts` - детализация ошибок
- `src/routes/api/auth/login/+server.ts` - проверка production
- `docker-compose.yml` - порт контейнера

### 3. Security

```env
JWT_SECRET=your-secret-key-change-in-production-generate-with-openssl-rand-base64-64
JWT_EXPIRES_IN=7d
```

**Использование:**
- `JWT_SECRET` - **ОБЯЗАТЕЛЬНО!** Секретный ключ для JWT токенов
- `JWT_EXPIRES_IN` - время жизни JWT токена (опционально, по умолчанию 7d)

**Где используется:**
- `src/lib/server/auth.ts` - создание и проверка JWT токенов
- Валидация: проверка наличия и длины (минимум 32 символа)

**ВАЖНО:** 
- В production обязательно используйте сильный случайный ключ
- Сгенерировать: `openssl rand -base64 64`
- Никогда не используйте дефолтное значение!

### 4. Public Variables (Build Time)

```env
PUBLIC_SITE_URL=http://localhost
PUBLIC_YM_COUNTER_ID=
PUBLIC_GA4_ID=
PUBLIC_GOOGLE_VERIFICATION=
PUBLIC_YANDEX_VERIFICATION=
```

**Использование:**
- Префикс `PUBLIC_` означает, что переменные доступны в клиентском коде
- Эти переменные используются во время сборки SvelteKit

**Где используется:**

#### `PUBLIC_SITE_URL`
- `src/routes/rss.xml/+server.ts` - базовый URL для RSS
- `src/routes/sitemap.xml/+server.ts` - базовый URL для sitemap
- `src/lib/utils/seo.js` - генерация SEO мета-тегов
- `src/lib/components/SeoHead.svelte` - canonical URL

#### `PUBLIC_YM_COUNTER_ID` и `PUBLIC_GA4_ID`
- `src/routes/+layout.svelte` - инициализация аналитики
- `src/lib/utils/analytics.js` - функции аналитики

#### `PUBLIC_GOOGLE_VERIFICATION` и `PUBLIC_YANDEX_VERIFICATION`
- Используются для верификации сайта в поисковых системах
- Добавляются в `<meta>` теги в `app.html` или `SeoHead.svelte`

### 5. Features & Options

```env
ENABLE_AUTH_RATE_LIMIT=false
LOG_LEVEL=
```

**Использование:**

#### `ENABLE_AUTH_RATE_LIMIT`
- Включает rate limiting для авторизации в development
- По умолчанию отключен для удобства тестирования

**Где используется:**
- `src/hooks.server.ts` - проверка перед применением rate limiter

#### `LOG_LEVEL`
- Уровень логирования: `debug`, `info`, `warn`, `error`
- По умолчанию: `debug` в development, `info` в production

**Где используется:**
- `src/lib/server/logger.ts` - настройка уровня логирования

### 6. Data Import

```env
IMPORT_LIMIT=0
FORCE_IMPORT=false
```

**Использование:**

#### `IMPORT_LIMIT`
- Лимит на количество импортируемых строк из CSV
- `0` = импортировать все строки (4000+)
- `100` = импортировать первые 100 строк (для теста)

#### `FORCE_IMPORT`
- Принудительный импорт данных, даже если они уже есть в БД
- `true` = принудительный импорт
- `false` = пропустить импорт, если данные уже есть

**Где используется:**
- `scripts/import-data.js` - импорт данных из CSV
- `docker-compose.yml` - передача в контейнер

## Использование в коде

### Server-side (Private)

```typescript
// Используем $env/dynamic/private для runtime переменных
import { env } from '$env/dynamic/private';

const jwtSecret = env.JWT_SECRET;
```

**Файлы:**
- `src/lib/server/auth.ts` - `JWT_SECRET`

### Server-side (Public)

```typescript
// Используем $env/dynamic/public для runtime переменных
import { env } from '$env/dynamic/public';

const baseUrl = env.PUBLIC_SITE_URL || 'http://localhost:3000';
```

**Файлы:**
- `src/routes/rss.xml/+server.ts` - `PUBLIC_SITE_URL`
- `src/routes/sitemap.xml/+server.ts` - `PUBLIC_SITE_URL`

### Client-side (Public)

```typescript
// Используем $env/static/public для build-time переменных
import { PUBLIC_YM_COUNTER_ID, PUBLIC_GA4_ID } from '$env/static/public';
```

**Файлы:**
- `src/routes/+layout.svelte` - `PUBLIC_YM_COUNTER_ID`, `PUBLIC_GA4_ID`
- `src/lib/components/SeoHead.svelte` - `PUBLIC_SITE_URL`

### Process.env (Node.js)

```typescript
// Используем process.env для встроенных переменных
const nodeEnv = process.env.NODE_ENV;
const logLevel = process.env.LOG_LEVEL;
```

**Файлы:**
- `src/lib/server/db.ts` - `NODE_ENV`
- `src/lib/server/logger.ts` - `NODE_ENV`, `LOG_LEVEL`
- `src/hooks.server.ts` - `ENABLE_AUTH_RATE_LIMIT`
- `scripts/import-data.js` - `IMPORT_LIMIT`, `FORCE_IMPORT`

## Docker Compose

В `docker-compose.yml` переменные используются следующим образом:

```yaml
environment:
  DATABASE_URL: mysql://${MYSQL_USER:-gooddrive_user}:${MYSQL_PASSWORD:-gooddrive_password}@mysql:3306/${MYSQL_DATABASE:-gooddrive_db}
  JWT_SECRET: ${JWT_SECRET:-your-secret-key-change-in-production}
  NODE_ENV: production
  PORT: 3000
```

**Build-time переменные** (для SvelteKit сборки):

```yaml
build:
  args:
    PUBLIC_SITE_URL: ${PUBLIC_SITE_URL:-http://localhost}
    PUBLIC_YM_COUNTER_ID: ${PUBLIC_YM_COUNTER_ID:-}
    PUBLIC_GA4_ID: ${PUBLIC_GA4_ID:-}
    PUBLIC_GOOGLE_VERIFICATION: ${PUBLIC_GOOGLE_VERIFICATION:-}
    PUBLIC_YANDEX_VERIFICATION: ${PUBLIC_YANDEX_VERIFICATION:-}
```

## Проверка переменных

### Обязательные переменные:

1. ✅ `JWT_SECRET` - проверяется в `src/lib/server/auth.ts`
2. ✅ `DATABASE_URL` - используется Prisma (автоматически формируется)
3. ✅ `MYSQL_*` - используются в docker-compose

### Опциональные переменные:

- `PUBLIC_SITE_URL` - имеет fallback значения
- `PUBLIC_YM_COUNTER_ID`, `PUBLIC_GA4_ID` - проверяются на наличие перед использованием
- `LOG_LEVEL` - имеет дефолтные значения
- `IMPORT_LIMIT` - имеет дефолтное значение (100)
- `FORCE_IMPORT` - имеет дефолтное значение (false)

## Рекомендации

1. **Всегда используйте `.env.example` как шаблон**
2. **В production обязательно измените:**
   - `JWT_SECRET` - сгенерируйте новый ключ
   - `MYSQL_ROOT_PASSWORD` - используйте сильный пароль
   - `MYSQL_PASSWORD` - используйте сильный пароль
   - `PUBLIC_SITE_URL` - укажите реальный домен
3. **Не коммитьте `.env` файл в Git** (уже в `.gitignore`)
4. **Используйте разные `.env` файлы для разных окружений:**
   - `.env.development`
   - `.env.production`
   - `.env.local` (для локальных переопределений)

## Генерация JWT_SECRET

```bash
# Linux/Mac
openssl rand -base64 64

# Windows PowerShell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Troubleshooting

### Переменная не работает

1. Проверьте, что переменная указана в `.env` файле
2. Для `PUBLIC_*` переменных - пересоберите приложение (`npm run build`)
3. Для runtime переменных - перезапустите сервер
4. Проверьте правильность префикса (`PUBLIC_` для клиентского кода)

### Переменная undefined

1. Убедитесь, что используете правильный импорт:
   - `$env/static/public` - для build-time публичных переменных
   - `$env/dynamic/public` - для runtime публичных переменных
   - `$env/dynamic/private` - для runtime приватных переменных
2. Проверьте, что переменная указана в `.env` файле
3. Для Docker - проверьте, что переменная передана в `docker-compose.yml`

