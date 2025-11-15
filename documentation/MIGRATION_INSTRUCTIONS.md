# 📋 Инструкции по миграции Prisma

## ⚠️ Важно! Ошибка 500 исправляется выполнением миграции

Для того чтобы форма консультации заработала, необходимо выполнить миграцию Prisma для создания таблицы `help_requests` в базе данных.

## 🔧 Шаги для исправления:

### 1. Остановите dev сервер (если запущен)
Нажмите `Ctrl+C` в терминале, где запущен `npm run dev` или `make dev`

### 2. Выполните миграцию Prisma:

```bash
npx prisma migrate dev --name add_help_requests
```

Эта команда:
- ✅ Создаст миграцию для таблицы `help_requests`
- ✅ Применит миграцию к базе данных
- ✅ Автоматически выполнит `prisma generate`

### 3. Если возникла ошибка с блокировкой файла:

Если вы видите ошибку типа `EPERM: operation not permitted`, это означает, что Prisma Client используется dev сервером.

**Решение:**
1. Остановите dev сервер полностью
2. Подождите 2-3 секунды
3. Выполните команду снова:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name add_help_requests
   ```

### 4. Если миграция уже существует:

Если вы видите сообщение что миграция уже существует, используйте:

```bash
npx prisma migrate deploy
```

Или для разработки:

```bash
npx prisma migrate dev
```

### 5. Перезапустите dev сервер:

```bash
npm run dev
```

или

```bash
make dev
```

## ✅ После выполнения миграции:

1. Форма консультации начнет сохранять данные в БД
2. Запросы будут видны в админ-панели в разделе "Запросы"
3. Ошибка 500 исчезнет

## 🔍 Проверка:

После миграции проверьте:

1. Таблица создана в БД:
   ```bash
   npx prisma studio
   ```
   Откроется Prisma Studio, где вы можете проверить наличие таблицы `help_requests`

2. Форма работает:
   - Перейдите на главную страницу
   - Прокрутите до формы "Онлайн-помощь специалиста"
   - Заполните форму и отправьте
   - Должно появиться сообщение "Ваша заявка отправлена..."

3. Запрос в админке:
   - Войдите в админ-панель
   - Перейдите в раздел "Запросы"
   - Должен появиться отправленный запрос

## 🐛 Если проблема сохраняется:

1. Проверьте логи сервера в консоли
2. Проверьте подключение к БД в `.env`
3. Убедитесь, что таблица создана:
   ```sql
   SHOW TABLES LIKE 'help_requests';
   ```

## 📝 Альтернативный способ (если миграция не работает):

Если миграция по какой-то причине не работает, можно создать таблицу вручную:

```sql
CREATE TABLE IF NOT EXISTS help_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) DEFAULT 'help_request',
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  vin VARCHAR(50),
  message TEXT,
  status VARCHAR(20) DEFAULT 'new',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Затем выполните:
```bash
npx prisma generate
```

---

**После выполнения этих шагов все должно работать!** ✅

