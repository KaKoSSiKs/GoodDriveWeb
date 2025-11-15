# Исправление проблемы аутентификации MySQL

## Проблема
Ошибка: `P1000: Authentication failed against database server at 'db', the provided database credentials for 'gooddrive_user' are not valid.`

## Причина
MySQL entrypoint создает пользователя с плагином `caching_sha2_password` (по умолчанию в MySQL 8.0), но Prisma подключается с `mysql_native_password`. Init-скрипты выполняются только при первой инициализации, поэтому если volume уже существует, пользователь не исправляется.

## Решение

### Вариант 1: Быстрое исправление (рекомендуется)

Выполните на VPS одну команду для исправления пользователя:

```bash
docker exec -it gooddrive-db mysql -u root -prootpassword -e "ALTER USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'gooddrive_password'; GRANT ALL PRIVILEGES ON \`gooddrive_db\`.* TO 'gooddrive_user'@'%'; FLUSH PRIVILEGES;"
```

**Если используется другой пароль root**, замените `rootpassword` на ваш пароль.

### Вариант 2: Использование SQL файла

1. Скопируйте файл `scripts/fix-mysql-user.sql` на VPS
2. Выполните:

```bash
docker exec -i gooddrive-db mysql -u root -prootpassword < scripts/fix-mysql-user.sql
```

### Вариант 3: Пересоздание базы данных (если данные не важны)

**ВНИМАНИЕ: Это удалит все данные!**

```bash
docker-compose down -v
docker-compose up -d --build
```

## Проверка

После исправления проверьте, что пользователь имеет правильный плагин:

```bash
docker exec -it gooddrive-db mysql -u root -prootpassword -e "SELECT User, Host, plugin FROM mysql.user WHERE User = 'gooddrive_user';"
```

Должно быть: `plugin = mysql_native_password`

## Автоматическое исправление

Чтобы исправление выполнялось автоматически при каждом запуске, можно добавить в `docker-compose.yml` отдельный сервис или использовать init-контейнер, но проще всего - выполнить команду из Варианта 1 один раз после первого запуска.

