# 🚀 Быстрый старт GoodDrive

## Требования

- **Docker Desktop** 4.0+
- **Git**
- 4 GB RAM минимум
- 10 GB свободного места на диске

---

## Запуск за 60 секунд

### Windows (PowerShell)

```powershell
# 1. Клонировать проект (если ещё не клонирован)
cd gooddrive-sveltekit

# 2. Запустить автоматический скрипт
.\start.ps1
```

### Linux / macOS

```bash
# 1. Клонировать проект
cd gooddrive-sveltekit

# 2. Дать права на выполнение и запустить
chmod +x start.sh
./start.sh
```

### Или напрямую через Docker Compose

```bash
cd gooddrive-sveltekit
docker-compose up -d
```

---

## ✅ Проверка работы

После запуска откройте в браузере:

### 🌐 Основной сайт
**http://localhost:3000**

- Главная страница
- Каталог запчастей
- Корзина и оформление заказа

### 👨‍💼 Админ-панель
**http://localhost:3000/admin**

**Учётные данные:**
- Email: `admin`
- Пароль: `12345678`

Доступные разделы:
- Dashboard - общая статистика
- Inventory - управление товарами
- Orders - заказы клиентов
- Customers - CRM
- Analytics - аналитика продаж
- Finance - финансы

### 🗄️ PhpMyAdmin
**http://localhost:8080**

**Учётные данные:**
- Сервер: `mysql`
- Пользователь: `gooddrive_user`
- Пароль: `gooddrive_password`
- База данных: `gooddrive`

---

## 📊 Проверка статуса контейнеров

```bash
# Просмотр запущенных контейнеров
docker-compose ps

# Должны быть запущены 3 контейнера:
# - gooddrive-app (healthy)
# - gooddrive-mysql (healthy)
# - gooddrive-phpmyadmin (running)
```

---

## 📝 Логи

```bash
# Все логи
docker-compose logs -f

# Только приложение
docker-compose logs -f app

# Только БД
docker-compose logs -f mysql

# Последние 50 строк
docker-compose logs --tail 50 app
```

---

## 🛠️ Управление

### Остановка

```bash
# Остановить все контейнеры
docker-compose down

# Остановить и удалить volumes (БД будет очищена)
docker-compose down -v
```

### Перезапуск

```bash
# Быстрый перезапуск
docker-compose restart

# Полный перезапуск с пересборкой
docker-compose down
docker-compose up -d --build
```

### Пересоздание БД

```bash
# Остановить и удалить данные
docker-compose down -v

# Запустить заново
docker-compose up -d

# Дождаться старта MySQL (30 сек) и заполнить БД
docker-compose exec app npm run db:seed
```

---

## 🐛 Решение проблем

### Порт 3000 уже занят

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Или измените порт в docker-compose.yml
# ports: - "3001:3000"
```

### Ошибка подключения к БД

```bash
# Проверьте что MySQL запущен и healthy
docker-compose ps

# Перезапустите MySQL
docker-compose restart mysql

# Проверьте логи
docker-compose logs mysql
```

### Контейнер app падает

```bash
# Просмотрите логи
docker-compose logs app

# Пересоберите образ
docker-compose build --no-cache app
docker-compose up -d app
```

### Нет данных в БД

```bash
# Запустите seed скрипт
docker-compose exec app npm run db:seed
```

---

## 🔧 Development режим

```bash
# Запуск с hot-reload
docker-compose -f docker-compose.dev.yml up -d

# Логи в реальном времени
docker-compose -f docker-compose.dev.yml logs -f app
```

В dev режиме:
- ✅ Hot-reload при изменении файлов
- ✅ Source maps для дебага
- ✅ Детальные логи
- ✅ Vite dev server на 5173 (опционально)

---

## 📚 Полезные команды

### Prisma

```bash
# Prisma Studio (GUI для БД)
docker-compose exec app npx prisma studio
# Откройте http://localhost:5555

# Создать миграцию
docker-compose exec app npx prisma migrate dev --name my_migration

# Применить миграции
docker-compose exec app npx prisma migrate deploy

# Сгенерировать клиент
docker-compose exec app npx prisma generate
```

### Bash в контейнере

```bash
# Войти в контейнер приложения
docker-compose exec app sh

# Войти в MySQL
docker-compose exec mysql mysql -u gooddrive_user -pgooddrive_password gooddrive
```

### Очистка Docker

```bash
# Удалить неиспользуемые образы
docker system prune -a

# Удалить volumes
docker volume prune

# Полная очистка
docker system prune -a --volumes
```

---

## 📖 Документация

- **CHANGES.md** - Полный список всех изменений
- **RECOMMENDATIONS.md** - Рекомендации по улучшению
- **README.md** - Основная документация проекта

---

## 🎉 Готово!

Ваш GoodDrive работает и готов к использованию!

**Следующие шаги:**
1. Изучите админ-панель
2. Создайте несколько тестовых заказов
3. Протестируйте все функции
4. Измените дефолтные пароли в production

**Поддержка:**
- Проблемы? Проверьте логи: `docker-compose logs -f`
- Вопросы? Смотрите документацию в папке `documentation/`

---

_Создано с ❤️ для GoodDrive_

