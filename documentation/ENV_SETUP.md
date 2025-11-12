# Environment Variables Setup Guide

## Создание .env файла

Создайте файл `.env` в корне проекта со следующим содержимым:

```bash
# Database Configuration
DATABASE_URL="mysql://gooddrive_user:gooddrive_password@localhost:3306/gooddrive"

# JWT Secret (CHANGE IN PRODUCTION!)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Site Configuration
PUBLIC_SITE_URL="http://localhost:3000"

# Analytics (получите коды на соответствующих платформах)
# Yandex.Metrika: https://metrika.yandex.ru/
PUBLIC_YM_COUNTER_ID=""

# Google Analytics 4: https://analytics.google.com/
PUBLIC_GA4_ID=""

# SEO Verification Codes
# Google Search Console: https://search.google.com/search-console
PUBLIC_GOOGLE_VERIFICATION=""

# Yandex.Webmaster: https://webmaster.yandex.ru/
PUBLIC_YANDEX_VERIFICATION=""

# Redis Cache (optional, for production)
REDIS_URL="redis://localhost:6379"
```

## Для Production

Измените следующие значения:

1. **JWT_SECRET** - сгенерируйте случайную строку
2. **PUBLIC_SITE_URL** - ваш production домен
3. **PUBLIC_YM_COUNTER_ID** - ID счетчика Yandex.Metrika
4. **PUBLIC_GA4_ID** - ID Google Analytics 4
5. **PUBLIC_GOOGLE_VERIFICATION** - код верификации Google
6. **PUBLIC_YANDEX_VERIFICATION** - код верификации Yandex

## Использование в коде

```typescript
// В server-side коде
import { JWT_SECRET } from '$env/static/private';

// В client-side коде
import { PUBLIC_SITE_URL } from '$env/static/public';
```

