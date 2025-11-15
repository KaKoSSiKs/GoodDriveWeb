# 📦 Импорт данных из CSV в MySQL

## Быстрый способ

### Вариант 1: Через Docker (рекомендуется)

```bash
# Войти в контейнер приложения
docker compose exec app sh

# Запустить импорт
node scripts/import-data.js
```

### Вариант 2: Одной командой

```bash
docker compose exec app node scripts/import-data.js
```

## Настройка импорта

### Импортировать все строки (4000+)

```bash
# Установить переменную окружения
docker compose exec -e IMPORT_LIMIT=0 app node scripts/import-data.js
```

Или в `.env` файле:
```env
IMPORT_LIMIT=0
```

### Импортировать первые 100 строк (для теста)

```bash
docker compose exec -e IMPORT_LIMIT=100 app node scripts/import-data.js
```

### Принудительный импорт (даже если данные уже есть)

```bash
docker compose exec -e FORCE_IMPORT=true app node scripts/import-data.js
```

Или в `.env`:
```env
FORCE_IMPORT=true
```

## Проверка данных

### Проверить количество товаров

```bash
# Войти в контейнер
docker compose exec app sh

# Запустить Prisma Studio (GUI для БД)
npx prisma studio
```

Или через MySQL:

```bash
# Подключиться к MySQL
docker compose exec mysql mysql -u gooddrive_user -p gooddrive_db

# Выполнить запрос
SELECT COUNT(*) FROM catalog_parts;
```

### Проверить через API

```bash
# Health check (показывает количество товаров)
curl http://localhost:3000/api/health

# Список товаров
curl http://localhost:3000/api/parts?page=1&page_size=10
```

## Troubleshooting

### Ошибка: "CSV файл не найден"

Проверьте, что CSV файл существует:

```bash
# Проверить наличие файла
docker compose exec app ls -la docker/mysql/data.csv
docker compose exec app ls -la db_of_catalog.csv

# Если файл не найден, скопируйте его
docker compose cp docker/mysql/data.csv app:/app/docker/mysql/data.csv
```

### Ошибка: "В базе данных уже есть товары"

Скрипт автоматически пропускает импорт, если данные уже есть. Для принудительного импорта:

```bash
docker compose exec -e FORCE_IMPORT=true app node scripts/import-data.js
```

### Ошибка подключения к БД

```bash
# Проверить подключение
docker compose exec app node scripts/test-db-connection.js

# Проверить переменные окружения
docker compose exec app env | grep DATABASE_URL
```

### Импорт идет очень долго

Это нормально для 4000+ строк. Скрипт показывает прогресс каждые 10 товаров.

Можно импортировать меньше для теста:

```bash
docker compose exec -e IMPORT_LIMIT=100 app node scripts/import-data.js
```

## Логи импорта

Скрипт выводит подробные логи:

- ✅ Успешные операции
- ⚠️ Предупреждения
- ❌ Ошибки
- 📊 Статистика импорта

Пример вывода:
```
🚀 Начинаем импорт данных из CSV...

📊 Конфигурация:
  - Лимит импорта: все строки
  - CSV файл: /app/docker/mysql/data.csv
  - Папка изображений: /app/static/images/parts

📄 Всего строк в CSV: 4001

📦 Будет обработано: 4000 товаров

📊 Прогресс: 10/4000 (0%)
  ✅ Создано: 8 | Обновлено: 2 | Пропущено: 0
  📷 Изображений: 10 загружено | 0 ошибок

...

✅ Импорт завершен!

📊 Итоговая статистика:
  📦 Брендов создано: 45
  🏭 Складов создано: 3
  ✅ Товаров создано: 3850
  🔄 Товаров обновлено: 150
  ⏭️  Товаров пропущено: 0
  📷 Изображений загружено: 3850
  ❌ Изображений не загружено: 0
  ⚠️  Ошибок: 0
```

## После импорта

1. Проверить работу сайта:
   ```bash
   curl http://nikitintex.ru
   ```

2. Проверить API:
   ```bash
   curl http://nikitintex.ru/api/parts?page=1&page_size=10
   ```

3. Проверить логи приложения (не должно быть ошибок 500):
   ```bash
   docker compose logs app | tail -50
   ```

