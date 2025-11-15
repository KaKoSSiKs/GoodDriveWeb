# 🌐 Настройка внешнего Nginx на хосте

## Проблема

На сервере уже установлен nginx на хосте, который занимает порт 80. В production лучше использовать внешний nginx для проксирования на Docker контейнер.

## Решение

### 1. Убедитесь, что приложение запущено

```bash
docker compose ps
# Приложение должно быть доступно на localhost:3000
```

### 2. Создайте конфигурацию nginx на хосте

Создайте файл `/etc/nginx/sites-available/nikitintex.ru`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name nikitintex.ru www.nikitintex.ru;

    # Логи
    access_log /var/log/nginx/nikitintex.ru.access.log;
    error_log /var/log/nginx/nikitintex.ru.error.log;

    # Максимальный размер загружаемых файлов
    client_max_body_size 50M;

    # Проксирование на Docker контейнер
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # Заголовки для правильной работы прокси
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket поддержка
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Буферизация
        proxy_buffering off;
    }

    # Кэширование статических файлов
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot|webp)$ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, immutable";
        expires 30d;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
```

### 3. Активируйте конфигурацию

```bash
# Создать символическую ссылку
sudo ln -s /etc/nginx/sites-available/nikitintex.ru /etc/nginx/sites-enabled/

# Проверить конфигурацию
sudo nginx -t

# Перезагрузить nginx
sudo systemctl reload nginx
```

### 4. Настройка SSL (HTTPS)

После настройки HTTP, установите SSL:

```bash
# Установить certbot
sudo apt-get install certbot python3-certbot-nginx

# Получить сертификат
sudo certbot --nginx -d nikitintex.ru -d www.nikitintex.ru
```

Certbot автоматически обновит конфигурацию nginx для HTTPS.

### 5. Проверка

```bash
# Проверить статус nginx
sudo systemctl status nginx

# Проверить логи
sudo tail -f /var/log/nginx/nikitintex.ru.error.log

# Проверить работу
curl http://nikitintex.ru
```

## Альтернатива: Использовать nginx в Docker

Если вы хотите использовать nginx в Docker, но порт 80 занят:

1. Измените порт в `docker-compose.yml`:
   ```yaml
   nginx:
     ports:
       - "8080:80"  # Используйте другой порт
   ```

2. Настройте внешний nginx для проксирования на `localhost:8080`

## Рекомендации

- **Для production:** Используйте внешний nginx на хосте (как описано выше)
- **Для разработки:** Можно использовать nginx в Docker на другом порту
- **Безопасность:** Не пробрасывайте порт MySQL наружу в production

## Troubleshooting

### Nginx не запускается

```bash
# Проверить конфигурацию
sudo nginx -t

# Проверить логи
sudo tail -50 /var/log/nginx/error.log
```

### 502 Bad Gateway

1. Проверить, что приложение запущено:
   ```bash
   docker compose ps app
   curl http://localhost:3000
   ```

2. Проверить логи nginx:
   ```bash
   sudo tail -f /var/log/nginx/nikitintex.ru.error.log
   ```

3. Проверить, что порт 3000 доступен:
   ```bash
   sudo netstat -tlnp | grep 3000
   ```

