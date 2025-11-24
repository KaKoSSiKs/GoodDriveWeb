# Руководство по развертыванию GoodDrive

Это руководство описывает процесс развертывания приложения GoodDrive на удаленном сервере.

## Требования

- Linux сервер (Ubuntu 20.04+ рекомендуется)
- Docker 20.10+
- Docker Compose 2.0+ (или docker-compose 1.29+)
- Минимум 2GB RAM
- Минимум 10GB свободного места на диске

## Быстрый старт

### 1. Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker (если не установлен)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose (если не установлен)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
# Выйдите и войдите снова для применения изменений
```

### 2. Клонирование проекта

```bash
# Клонируйте репозиторий
git clone <your-repo-url> gooddrive
cd gooddrive

# Переключитесь на нужную ветку (если необходимо)
git checkout main  # или feature2, production и т.д.
```

### 3. Настройка переменных окружения

```bash
# Создайте .env файл из примера (если есть)
cp .env.example .env

# Отредактируйте .env файл
nano .env
```

**Важные переменные для настройки:**

```env
# База данных
DATABASE_URL=mysql://gooddrive_user:ВАШ_ПАРОЛЬ@mysql:3306/gooddrive_db
MYSQL_ROOT_PASSWORD=ВАШ_СИЛЬНЫЙ_ПАРОЛЬ_ROOT
MYSQL_DATABASE=gooddrive_db
MYSQL_USER=gooddrive_user
MYSQL_PASSWORD=ВАШ_СИЛЬНЫЙ_ПАРОЛЬ

# JWT секрет (сгенерируйте случайную строку)
JWT_SECRET=ВАШ_СЛУЧАЙНЫЙ_СЕКРЕТ_ДЛИНОЙ_НЕ_МЕНЕЕ_32_СИМВОЛОВ

# Окружение
NODE_ENV=production

# Публичные переменные (опционально)
PUBLIC_SITE_URL=https://yourdomain.com
PUBLIC_YM_COUNTER_ID=ваш_яндекс_метрика_id
PUBLIC_GA4_ID=ваш_google_analytics_id
```

### 4. Подготовка данных

Убедитесь, что файл `db_of_catalog.csv` находится в корне проекта. Если файл находится в другом месте, скопируйте его:

```bash
# Если CSV находится в другом месте
cp /path/to/your/catalog.csv ./db_of_catalog.csv
```

### 5. Развертывание

```bash
# Сделайте скрипт деплоя исполняемым
chmod +x deploy.sh

# Запустите деплой
./deploy.sh
```

Скрипт автоматически:
1. Проверит наличие всех зависимостей
2. Остановит существующие контейнеры
3. Соберет Docker образы
4. Запустит MySQL и дождется его готовности
5. Запустит приложение, которое выполнит:
   - Применение миграций Prisma
   - Импорт данных из CSV
   - Настройку категорий товаров (backfill)
   - Создание администратора

### 6. Проверка работы

```bash
# Проверка статуса контейнеров
docker-compose ps

# Просмотр логов приложения
docker-compose logs -f app

# Проверка health check
curl http://localhost:3000/api/health
```

## Ручное развертывание (без скрипта)

Если вы предпочитаете выполнить шаги вручную:

```bash
# 1. Сборка образов
docker-compose build

# 2. Запуск MySQL
docker-compose up -d mysql

# 3. Ожидание готовности MySQL (проверка каждые 2 секунды)
until docker exec gooddrive-mysql mysqladmin ping -h localhost --silent; do
  echo "Ожидание MySQL..."
  sleep 2
done

# 4. Запуск приложения (автоматически выполнит миграции и скрипты)
docker-compose up -d app

# 5. Просмотр логов
docker-compose logs -f app
```

## Использование npm скриптов

Вы также можете использовать npm скрипты для настройки базы данных:

```bash
# Установка зависимостей (если запускаете локально)
npm install

# Генерация Prisma Client
npm run prisma:generate

# Применение миграций
npm run prisma:deploy

# Импорт данных
npm run import:data

# Настройка категорий
npm run backfill:categories

# Создание администратора
npm run create:admin

# Все шаги сразу
npm run deploy:setup
```

## Настройка Nginx (рекомендуется)

Для production рекомендуется использовать Nginx как reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Редирект на HTTPS (если настроен SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Обновление приложения

Для обновления приложения после изменений в коде:

```bash
# 1. Получите последние изменения
git pull

# 2. Пересоберите образы
docker-compose build --no-cache

# 3. Перезапустите контейнеры
docker-compose down
docker-compose up -d

# Или используйте скрипт деплоя
./deploy.sh
```

## Резервное копирование базы данных

```bash
# Создание бэкапа
docker exec gooddrive-mysql mysqldump -u root -pВАШ_ROOT_ПАРОЛЬ gooddrive_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из бэкапа
docker exec -i gooddrive-mysql mysql -u root -pВАШ_ROOT_ПАРОЛЬ gooddrive_db < backup_YYYYMMDD_HHMMSS.sql
```

## Мониторинг

### Просмотр логов

```bash
# Все логи
docker-compose logs -f

# Только приложение
docker-compose logs -f app

# Только MySQL
docker-compose logs -f mysql

# Последние 100 строк
docker-compose logs --tail=100 app
```

### Проверка использования ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Использование диска
docker system df
```

## Устранение неполадок

### Приложение не запускается

1. Проверьте логи: `docker-compose logs app`
2. Убедитесь, что MySQL запущен: `docker-compose ps`
3. Проверьте переменные окружения в `.env`
4. Проверьте, что порт 3000 свободен: `netstat -tuln | grep 3000`

### Ошибки подключения к базе данных

1. Проверьте, что MySQL контейнер запущен: `docker-compose ps mysql`
2. Проверьте логи MySQL: `docker-compose logs mysql`
3. Убедитесь, что `DATABASE_URL` в `.env` указывает на `mysql:3306` (для Docker) или `localhost:3306` (для локального подключения)
4. Проверьте пароли в `.env` соответствуют настройкам MySQL контейнера

### Миграции не применяются

1. Проверьте подключение к базе данных
2. Убедитесь, что Prisma Client сгенерирован: `npm run prisma:generate`
3. Попробуйте применить миграции вручную: `docker-compose exec app npx prisma migrate deploy`

### Данные не импортируются

1. Проверьте наличие файла `db_of_catalog.csv` в корне проекта
2. Проверьте логи: `docker-compose logs app | grep import`
3. Убедитесь, что база данных пуста или установите `FORCE_IMPORT=true` в `.env` для принудительного импорта

## Безопасность

### Рекомендации для production

1. **Измените пароли по умолчанию** в `.env`
2. **Используйте сильные пароли** (минимум 16 символов, смесь букв, цифр и символов)
3. **Настройте SSL/TLS** через Nginx или другой reverse proxy
4. **Ограничьте доступ к портам** через firewall:
   ```bash
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp   # HTTP
   sudo ufw allow 443/tcp  # HTTPS
   sudo ufw enable
   ```
5. **Регулярно обновляйте** Docker образы и зависимости
6. **Настройте автоматические бэкапы** базы данных
7. **Используйте секреты** для хранения паролей (Docker Secrets, HashiCorp Vault и т.д.)

## Контакты и поддержка

При возникновении проблем проверьте:
- Логи приложения: `docker-compose logs app`
- Логи MySQL: `docker-compose logs mysql`
- Документацию проекта в `README.md`

