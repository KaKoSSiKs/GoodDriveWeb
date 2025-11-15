# 📦 Простой импорт данных - Инструкция

## Шаг 1: Настройте пароли в скрипте

Откройте файл `scripts/import-simple.js` и измените пароли в начале файла:

```javascript
const DB_CONFIG = {
  host: 'mysql',           // Не меняйте для Docker
  port: 3306,              // Не меняйте
  user: 'gooddrive_user',  // Не меняйте
  password: 'ВАШ_ПАРОЛЬ',  // ⬅️ ИЗМЕНИТЕ НА ВАШ ПАРОЛЬ!
  database: 'gooddrive_db' // Не меняйте
};
```

**Где взять пароль?**
- Посмотрите в файле `.env` на сервере: `MYSQL_PASSWORD=...`
- Или используйте дефолтный: `gooddrive_password`

## Шаг 2: Запустите импорт

```bash
docker compose exec app node scripts/import-simple.js
```

Всё! Скрипт:
- ✅ Подключится к MySQL с вашими паролями
- ✅ Найдет CSV файл автоматически
- ✅ Импортирует все 4000+ строк
- ✅ Покажет прогресс и статистику

## Если нужно импортировать только часть данных

Откройте `scripts/import-simple.js` и измените:

```javascript
const IMPORT_CONFIG = {
  // ...
  importLimit: 100,  // Импортировать только первые 100 строк
  // или
  importLimit: 0,    // Импортировать все строки
};
```

## Если данные уже есть и нужно обновить

Откройте `scripts/import-simple.js` и измените:

```javascript
const IMPORT_CONFIG = {
  // ...
  forceImport: true,  // Принудительный импорт (обновит существующие)
};
```

## Проверка после импорта

```bash
# Проверить количество товаров
docker compose exec app node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.part.count().then(count => {
  console.log('Товаров в базе:', count);
  prisma.$disconnect();
});
"
```

Или через API:
```bash
curl http://localhost:3000/api/health
```

## Troubleshooting

### Ошибка подключения

Проверьте пароль в `scripts/import-simple.js` - он должен совпадать с паролем в `.env` файле.

### CSV файл не найден

Скрипт ищет файл в нескольких местах. Проверьте:

```bash
docker compose exec app ls -la docker/mysql/data.csv
docker compose exec app ls -la db_of_catalog.csv
```

Если файл не найден, скопируйте его:

```bash
# На хосте
cp db_of_catalog.csv docker/mysql/data.csv

# Перезапустить контейнер для монтирования
docker compose restart app
```

