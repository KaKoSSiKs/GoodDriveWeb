#!/bin/sh
# Простой скрипт для исправления пользователя MySQL
# Использование: docker compose exec mysql sh /tmp/fix-user-simple.sh

# Пароли - ИЗМЕНИТЕ ЕСЛИ НУЖНО
ROOT_PASSWORD="rootpassword"  # ⬅️ ИЗМЕНИТЕ НА ВАШ ПАРОЛЬ ROOT
USER_PASSWORD="gooddrive_password"  # ⬅️ ИЗМЕНИТЕ НА ВАШ ПАРОЛЬ ПОЛЬЗОВАТЕЛЯ

echo "🔧 Исправление пользователя MySQL..."
echo ""

# Создаем SQL скрипт
mysql -u root -p"${ROOT_PASSWORD}" << EOF
CREATE DATABASE IF NOT EXISTS \`gooddrive_db\` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

DROP USER IF EXISTS 'gooddrive_user'@'%';

CREATE USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY '${USER_PASSWORD}';

GRANT ALL PRIVILEGES ON \`gooddrive_db\`.* TO 'gooddrive_user'@'%';

FLUSH PRIVILEGES;

SELECT User, Host, plugin FROM mysql.user WHERE User = 'gooddrive_user';
EOF

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Пользователь MySQL исправлен!"
else
  echo ""
  echo "❌ Ошибка! Проверьте пароль root."
fi

