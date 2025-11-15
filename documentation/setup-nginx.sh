#!/bin/bash

# Скрипт для быстрой настройки nginx на сервере
# Использование: sudo ./setup-nginx.sh

set -e

DOMAIN="nikitintex.ru"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
NGINX_CONFIG_FILE="$NGINX_SITES_AVAILABLE/$DOMAIN"

echo "🚀 Настройка nginx для $DOMAIN..."

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Пожалуйста, запустите скрипт с sudo"
    exit 1
fi

# Проверка наличия nginx
if ! command -v nginx &> /dev/null; then
    echo "❌ nginx не установлен. Устанавливаю..."
    apt-get update
    apt-get install -y nginx
fi

# Копирование конфигурации
if [ -f "nginx.conf" ]; then
    echo "📋 Копирование конфигурации nginx..."
    cp nginx.conf "$NGINX_CONFIG_FILE"
else
    echo "❌ Файл nginx.conf не найден!"
    exit 1
fi

# Создание символической ссылки
if [ -L "$NGINX_SITES_ENABLED/$DOMAIN" ]; then
    echo "⚠️  Символическая ссылка уже существует, удаляю..."
    rm "$NGINX_SITES_ENABLED/$DOMAIN"
fi

echo "🔗 Создание символической ссылки..."
ln -s "$NGINX_CONFIG_FILE" "$NGINX_SITES_ENABLED/$DOMAIN"

# Проверка конфигурации
echo "🔍 Проверка конфигурации nginx..."
if nginx -t; then
    echo "✅ Конфигурация nginx корректна"
else
    echo "❌ Ошибка в конфигурации nginx!"
    exit 1
fi

# Перезагрузка nginx
echo "🔄 Перезагрузка nginx..."
systemctl reload nginx

echo ""
echo "✅ nginx успешно настроен!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Убедитесь, что ваше приложение запущено на порту 3000"
echo "2. Проверьте работу: curl http://$DOMAIN"
echo "3. Для HTTPS установите SSL:"
echo "   sudo apt-get install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""

