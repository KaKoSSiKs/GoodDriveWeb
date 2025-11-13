-- SQL скрипт для исправления пользователя MySQL
-- Использование: docker exec -i gooddrive-db mysql -u root -prootpassword < scripts/fix-mysql-user.sql

-- Изменяем плагин аутентификации на mysql_native_password
ALTER USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'gooddrive_password';

-- Убеждаемся, что права доступа установлены
GRANT ALL PRIVILEGES ON `gooddrive_db`.* TO 'gooddrive_user'@'%';

-- Применяем изменения
FLUSH PRIVILEGES;

-- Проверяем результат
SELECT User, Host, plugin FROM mysql.user WHERE User = 'gooddrive_user';

