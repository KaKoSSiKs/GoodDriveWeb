# 🚀 Быстрое развертывание на сервере

## Проблема

Вы видите страницу "Welcome to nginx!" потому что nginx работает, но не знает, что нужно проксировать запросы на ваше Node.js приложение.

## Решение (3 простых шага)

### Шаг 1: Запустите ваше приложение на сервере

**Вариант A: С Docker (рекомендуется)**

```bash
# На сервере
cd /path/to/GoodDriveWeb
docker compose up -d --build
```

**Вариант B: Без Docker**

```bash
# На сервере
cd /path/to/GoodDriveWeb
npm install
npm run build
pm2 start build/index.js --name gooddrive
```

### Шаг 2: Настройте nginx

```bash
# На сервере
sudo cp nginx.conf /etc/nginx/sites-available/nikitintex.ru
sudo ln -s /etc/nginx/sites-available/nikitintex.ru /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Или используйте автоматический скрипт:

```bash
sudo ./setup-nginx.sh
```

### Шаг 3: Проверьте работу

Откройте в браузере: http://nikitintex.ru

Если все работает, установите SSL (HTTPS):

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d nikitintex.ru -d www.nikitintex.ru
```

## Что происходит?

1. **Ваше приложение** работает на порту 3000 (внутри сервера)
2. **nginx** принимает запросы на порту 80/443 (из интернета)
3. **nginx** проксирует эти запросы на ваше приложение (localhost:3000)

## Проверка

### Приложение запущено?

```bash
# Docker
docker compose ps

# PM2
pm2 status

# Проверка порта
sudo netstat -tlnp | grep 3000
```

### nginx работает?

```bash
sudo systemctl status nginx
curl http://localhost:3000
```

### Логи

```bash
# Логи приложения (Docker)
docker compose logs -f app

# Логи nginx
sudo tail -f /var/log/nginx/nikitintex.ru.error.log
```

## Частые проблемы

### 502 Bad Gateway

Приложение не запущено или не слушает порт 3000. Проверьте:

```bash
docker compose ps
# или
pm2 status
```

### Страница все еще показывает "Welcome to nginx"

1. Проверьте, что конфигурация применена:
   ```bash
   ls -la /etc/nginx/sites-enabled/ | grep nikitintex
   ```

2. Перезагрузите nginx:
   ```bash
   sudo systemctl reload nginx
   ```

3. Проверьте логи:
   ```bash
   sudo nginx -t
   sudo tail -50 /var/log/nginx/error.log
   ```

## Подробная инструкция

См. [DEPLOYMENT.md](./DEPLOYMENT.md) для полной документации.

