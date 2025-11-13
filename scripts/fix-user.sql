ALTER USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'gooddrive_password';
GRANT ALL PRIVILEGES ON `gooddrive_db`.* TO 'gooddrive_user'@'%';
FLUSH PRIVILEGES;
SELECT User, Host, plugin FROM mysql.user WHERE User = 'gooddrive_user';

