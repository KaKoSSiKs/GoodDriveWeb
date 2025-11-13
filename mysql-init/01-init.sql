-- Initial MySQL setup
-- This file is executed when MySQL container first starts
-- MySQL entrypoint уже создал пользователя из MYSQL_USER/MYSQL_PASSWORD
-- Этот скрипт изменяет плагин аутентификации на mysql_native_password
-- (MySQL 8.0 по умолчанию использует caching_sha2_password, который может вызывать проблемы)

-- Изменяем плагин аутентификации на mysql_native_password
-- Это работает даже если пользователь уже создан entrypoint скриптом
ALTER USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'gooddrive_password';

-- Grant all privileges on gooddrive_db database (на случай, если права не были установлены)
GRANT ALL PRIVILEGES ON `gooddrive_db`.* TO 'gooddrive_user'@'%';

-- Flush privileges to ensure they take effect
FLUSH PRIVILEGES;

-- Confirm user creation and authentication plugin
SELECT User, Host, plugin FROM mysql.user WHERE User = 'gooddrive_user';

