-- MySQL Initialization Script
-- Выполняется при первом запуске контейнера MySQL
-- Создает базу данных и настраивает пользователя

-- Создаем базу данных (если не существует)
CREATE DATABASE IF NOT EXISTS `gooddrive_db` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Используем базу данных
USE `gooddrive_db`;

-- Изменяем плагин аутентификации на mysql_native_password
-- (MySQL 8.0 по умолчанию использует caching_sha2_password, который может вызывать проблемы)
ALTER USER IF EXISTS 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'gooddrive_password';

-- Создаем пользователя (если не существует)
CREATE USER IF NOT EXISTS 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'gooddrive_password';

-- Предоставляем права
GRANT ALL PRIVILEGES ON `gooddrive_db`.* TO 'gooddrive_user'@'%';

-- Применяем изменения
FLUSH PRIVILEGES;

-- Подтверждаем создание пользователя
SELECT User, Host, plugin FROM mysql.user WHERE User = 'gooddrive_user';

