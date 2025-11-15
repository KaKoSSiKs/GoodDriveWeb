# ⚡ Быстрый импорт данных - 3 шага

## Шаг 1: Откройте и проверьте пароль

Откройте файл: `scripts/import-simple.js`

Найдите строку 18 и проверьте пароль:

```javascript
password: 'o7E-PX1P0t32vs3m-z',  // ⬅️ Если пароль другой - измените здесь!
```

**Если пароль не совпадает с вашим `.env` файлом - измените его в скрипте!**

## Шаг 2: Запустите импорт

```bash
docker compose exec app node scripts/import-simple.js
```

## Шаг 3: Готово!

Скрипт автоматически:
- ✅ Найдет CSV файл
- ✅ Импортирует все 4000+ строк
- ✅ Покажет прогресс каждые 100 товаров
- ✅ Выведет итоговую статистику

## Что делать если ошибка?

### Ошибка подключения к БД

1. Проверьте пароль в `scripts/import-simple.js` (строка 18)
2. Убедитесь, что пароль совпадает с `.env` файлом
3. Проверьте, что MySQL контейнер запущен: `docker compose ps mysql`

### CSV файл не найден

```bash
# Проверить наличие файла
docker compose exec app ls -la docker/mysql/data.csv
docker compose exec app ls -la db_of_catalog.csv

# Если файл не найден, скопируйте его на хосте:
cp db_of_catalog.csv docker/mysql/data.csv
docker compose restart app
```

## Проверка после импорта

```bash
# Через API
curl http://localhost:3000/api/health

# Должно вернуть JSON с partsCount > 0
```

---

**Всё! Больше ничего не нужно делать.**

