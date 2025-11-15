#!/bin/sh
# Скрипт для исправления пользователя MySQL
# Использует переменные окружения из контейнера

echo "🔍 Проверка переменных окружения в MySQL контейнере..."
echo ""

# Получаем пароли из переменных окружения контейнера
ROOT_PASS=$(docker compose exec -T mysql sh -c 'echo $MYSQL_ROOT_PASSWORD' 2>/dev/null | tr -d '\r\n')
USER_PASS=$(docker compose exec -T mysql sh -c 'echo $MYSQL_PASSWORD' 2>/dev/null | tr -d '\r\n')

if [ -z "$ROOT_PASS" ]; then
  echo "⚠️  Не удалось получить MYSQL_ROOT_PASSWORD из контейнера"
  echo "💡 Попробуем дефолтный пароль: rootpassword"
  ROOT_PASS="rootpassword"
else
  echo "✅ Найден MYSQL_ROOT_PASSWORD в контейнере"
fi

if [ -z "$USER_PASS" ]; then
  echo "⚠️  Не удалось получить MYSQL_PASSWORD из контейнера"
  echo "💡 Попробуем дефолтный пароль: gooddrive_password"
  USER_PASS="gooddrive_password"
else
  echo "✅ Найден MYSQL_PASSWORD в контейнере"
fi

echo ""
echo "🔧 Исправление пользователя MySQL..."
echo "   Root password: ${ROOT_PASS:0:5}..."
echo "   User password: ${USER_PASS:0:5}..."
echo ""

# Выполняем SQL команды
docker compose exec -T mysql mysql -u root -p"$ROOT_PASS" << EOF 2>&1 | grep -v "Using a password"
CREATE DATABASE IF NOT EXISTS \`gooddrive_db\` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

DROP USER IF EXISTS 'gooddrive_user'@'%';

CREATE USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY '$USER_PASS';

GRANT ALL PRIVILEGES ON \`gooddrive_db\`.* TO 'gooddrive_user'@'%';

FLUSH PRIVILEGES;

SELECT User, Host, plugin FROM mysql.user WHERE User = 'gooddrive_user';
EOF

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Пользователь MySQL успешно исправлен!"
  echo ""
  echo "📦 Теперь можно импортировать данные:"
  echo "   docker compose exec app node scripts/import-final.js"
else
  echo ""
  echo "❌ Ошибка! Возможные причины:"
  echo "   1. Пароль root неверный"
  echo "   2. MySQL контейнер не запущен"
  echo ""
  echo "💡 Попробуйте пересоздать MySQL контейнер:"
  echo "   docker compose down mysql"
  echo "   docker volume rm gooddriveweb_mysql_data"
  echo "   docker compose up -d mysql"
fi
