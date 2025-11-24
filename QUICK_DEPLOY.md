# Быстрый деплой GoodDrive

## Минимальные шаги для развертывания

### 1. На сервере

```bash
# Клонируйте проект
git clone <your-repo-url> gooddrive
cd gooddrive

# Настройте .env (скопируйте из .env.example если есть)
nano .env

# Сделайте скрипт исполняемым и запустите
chmod +x deploy.sh
./deploy.sh
```

### 2. Что делает deploy.sh

Скрипт автоматически:
- ✅ Проверяет наличие Docker и Docker Compose
- ✅ Проверяет наличие .env файла
- ✅ Собирает Docker образы
- ✅ Запускает MySQL
- ✅ Применяет миграции базы данных
- ✅ Импортирует данные из CSV
- ✅ Настраивает категории товаров
- ✅ Создает администратора (admin / 12345678)
- ✅ Запускает приложение

### 3. Проверка

```bash
# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f app

# Проверка health
curl http://localhost:3000/api/health
```

### 4. Доступ к приложению

- **Приложение**: http://your-server-ip:3000
- **Админ-панель**: http://your-server-ip:3000/admin
- **Логин**: admin
- **Пароль**: 12345678

## Важные переменные в .env

```env
DATABASE_URL=mysql://gooddrive_user:ВАШ_ПАРОЛЬ@mysql:3306/gooddrive_db
MYSQL_ROOT_PASSWORD=ВАШ_СИЛЬНЫЙ_ПАРОЛЬ
MYSQL_PASSWORD=ВАШ_ПАРОЛЬ
JWT_SECRET=ВАШ_СЛУЧАЙНЫЙ_СЕКРЕТ_32+_СИМВОЛОВ
NODE_ENV=production
```

## Обновление

```bash
git pull
./deploy.sh
```

## Подробная документация

См. [DEPLOYMENT.md](./DEPLOYMENT.md) для полной документации.

