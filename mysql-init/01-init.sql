-- Initial MySQL setup
-- This file is executed when MySQL container first starts

-- Create user with mysql_native_password authentication
CREATE USER IF NOT EXISTS 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'gooddrive_password';

-- Grant all privileges on gooddrive database
GRANT ALL PRIVILEGES ON `gooddrive`.* TO 'gooddrive_user'@'%';

-- Flush privileges to ensure they take effect
FLUSH PRIVILEGES;

-- Confirm user creation
SELECT User, Host, plugin FROM mysql.user WHERE User = 'gooddrive_user';

