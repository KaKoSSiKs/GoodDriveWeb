# 🚀 Инструкция по развертыванию на сервере

## Проблема

Если вы видите страницу "Welcome to nginx!", это означает, что:
- ✅ nginx установлен и работает
- ❌ nginx не настроен для проксирования на ваше Node.js приложение

## Решение

### Вариант 1: Развертывание с Docker (Рекомендуется)

#### 1. Подключитесь к серверу по SSH

```bash
ssh user@your-server-ip
```

#### 2. Установите Docker и Docker Compose (если еще не установлены)

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt-get install docker-compose-plugin

# Выйдите и войдите снова, чтобы применить изменения группы
```

#### 3. Скопируйте проект на сервер

```bash
# На вашем локальном компьютере
scp -r . user@your-server:/path/to/project
```

Или используйте Git:
```bash
git clone your-repo-url
cd GoodDriveWeb
```

#### 4. Создайте файл `.env` на сервере

```bash
nano .env
```

Добавьте следующие переменные:

```env
# База данных
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_DATABASE=gooddrive_db
MYSQL_USER=gooddrive_user
MYSQL_PASSWORD=your_secure_password

# Приложение
DATABASE_URL=mysql://gooddrive_user:your_secure_password@db:3306/gooddrive_db
JWT_SECRET=your_jwt_secret_key_here_generate_with_openssl_rand_base64_64
NODE_ENV=production
PORT=3000

# Публичные переменные (для сборки)
PUBLIC_SITE_URL=https://nikitintex.ru
PUBLIC_YM_COUNTER_ID=your_yandex_metrika_id
PUBLIC_GA4_ID=your_google_analytics_id
PUBLIC_GOOGLE_VERIFICATION=your_google_verification_code
PUBLIC_YANDEX_VERIFICATION=your_yandex_verification_code

# Импорт данных
IMPORT_LIMIT=0
```

#### 5. Соберите и запустите контейнеры

```bash
docker compose up -d --build
```

#### 6. Настройте nginx

Скопируйте конфигурацию nginx:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/nikitintex.ru
sudo ln -s /etc/nginx/sites-available/nikitintex.ru /etc/nginx/sites-enabled/
```

Проверьте конфигурацию:

```bash
sudo nginx -t
```

Если все хорошо, перезагрузите nginx:

```bash
sudo systemctl reload nginx
```

#### 7. Настройте SSL (HTTPS) с Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d nikitintex.ru -d www.nikitintex.ru
```

Certbot автоматически обновит конфигурацию nginx для HTTPS.

### Вариант 2: Развертывание без Docker

#### 1. Установите Node.js 20+ на сервере

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. Установите MySQL

```bash
sudo apt-get update
sudo apt-get install mysql-server
sudo mysql_secure_installation
```

#### 3. Создайте базу данных

```bash
sudo mysql -u root -p
```

В MySQL консоли:

```sql
CREATE DATABASE gooddrive_db;
CREATE USER 'gooddrive_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON gooddrive_db.* TO 'gooddrive_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 4. Скопируйте проект и установите зависимости

```bash
cd /path/to/project
npm install
```

#### 5. Настройте переменные окружения

Создайте `.env` файл (см. выше).

#### 6. Примените миграции и импортируйте данные

```bash
npx prisma generate
npx prisma migrate deploy
node scripts/import-data.js
```

#### 7. Соберите приложение

```bash
npm run build
```

#### 8. Запустите приложение с PM2 (рекомендуется)

```bash
# Установите PM2
sudo npm install -g pm2

# Запустите приложение
pm2 start build/index.js --name gooddrive

# Сохраните конфигурацию PM2
pm2 save
pm2 startup
```

#### 9. Настройте nginx

Скопируйте конфигурацию nginx (см. Вариант 1, шаг 6).

## Проверка работы

После настройки проверьте:

1. **Приложение работает:**
   ```bash
   curl http://localhost:3000
   ```

2. **Nginx проксирует правильно:**
   ```bash
   curl http://nikitintex.ru
   ```

3. **Логи приложения:**
   ```bash
   # Docker
   docker compose logs -f app
   
   # PM2
   pm2 logs gooddrive
   ```

4. **Логи nginx:**
   ```bash
   sudo tail -f /var/log/nginx/nikitintex.ru.error.log
   ```

## Решение проблем

### Приложение не запускается

1. Проверьте логи:
   ```bash
   docker compose logs app
   # или
   pm2 logs gooddrive
   ```

2. Проверьте подключение к базе данных:
   ```bash
   docker compose exec app node scripts/test-db-connection.js
   ```

3. Проверьте переменные окружения:
   ```bash
   docker compose exec app env | grep DATABASE_URL
   ```

### Nginx показывает 502 Bad Gateway

1. Убедитесь, что приложение запущено на порту 3000:
   ```bash
   sudo netstat -tlnp | grep 3000
   # или
   sudo ss -tlnp | grep 3000
   ```

2. Проверьте, что в nginx.conf указан правильный адрес:
   ```bash
   sudo cat /etc/nginx/sites-available/nikitintex.ru | grep proxy_pass
   ```

3. Проверьте логи nginx:
   ```bash
   sudo tail -50 /var/log/nginx/nikitintex.ru.error.log
   ```

### Домен не открывается

1. Проверьте DNS записи:
   ```bash
   nslookup nikitintex.ru
   dig nikitintex.ru
   ```

2. Убедитесь, что порты открыты в firewall:
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

## Обновление приложения

### С Docker:

```bash
git pull
docker compose down
docker compose up -d --build
```

### С PM2:

```bash
git pull
npm install
npm run build
pm2 restart gooddrive
```

## Мониторинг

- **Docker:** `docker compose ps`
- **PM2:** `pm2 status`
- **Nginx:** `sudo systemctl status nginx`
- **MySQL:** `sudo systemctl status mysql`

