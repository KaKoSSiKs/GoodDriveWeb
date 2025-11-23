#!/bin/bash
# GoodDrive Production Deployment Script
# Использование: ./deploy.sh
#
# Перед первым использованием сделайте скрипт исполняемым:
# chmod +x deploy.sh

set -e  # Остановка при ошибке

echo "================================================"
echo "   GoodDrive - Production Deployment Script"
echo "================================================"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка наличия необходимых команд
log_info "Проверка зависимостей..."

if ! command -v docker &> /dev/null; then
    log_error "Docker не установлен. Установите Docker и повторите попытку."
    exit 1
fi
log_success "Docker установлен"

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_error "Docker Compose не установлен. Установите Docker Compose и повторите попытку."
    exit 1
fi
log_success "Docker Compose установлен"

# Определяем команду docker compose
COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker compose"
fi

# Проверка .env файла
log_info "Проверка конфигурации..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        log_warning ".env файл не найден. Создаю из .env.example..."
        cp .env.example .env
        log_warning "Пожалуйста, отредактируйте .env файл перед продолжением!"
        exit 1
    else
        log_error ".env файл не найден и .env.example отсутствует."
        log_error "Создайте .env файл вручную с необходимыми переменными окружения."
        exit 1
    fi
fi
log_success ".env файл существует"

# Проверка наличия CSV файла для импорта
if [ ! -f db_of_catalog.csv ] && [ ! -f docker/mysql/data.csv ]; then
    log_warning "CSV файл каталога не найден. Импорт данных будет пропущен."
fi

# Остановка существующих контейнеров
log_info "Остановка существующих контейнеров..."
$COMPOSE_CMD down 2>/dev/null || true
log_success "Контейнеры остановлены"

# Сборка образов
log_info "Сборка Docker образов..."
$COMPOSE_CMD build --no-cache
if [ $? -ne 0 ]; then
    log_error "Ошибка сборки Docker образов"
    exit 1
fi
log_success "Образы собраны"

# Запуск сервисов
log_info "Запуск сервисов..."
$COMPOSE_CMD up -d mysql

# Ожидание готовности MySQL
log_info "Ожидание готовности MySQL..."
MAX_ATTEMPTS=60
ATTEMPT=0
MYSQL_READY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ] && [ "$MYSQL_READY" = false ]; do
    if docker exec gooddrive-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
        MYSQL_READY=true
        log_success "MySQL готов"
    else
        ATTEMPT=$((ATTEMPT + 1))
        echo -n "."
        sleep 2
    fi
done
echo ""

if [ "$MYSQL_READY" = false ]; then
    log_error "MySQL не запустился за отведенное время"
    exit 1
fi

# Запуск приложения (которое выполнит миграции и скрипты)
log_info "Запуск приложения..."
$COMPOSE_CMD up -d app

# Ожидание готовности приложения
log_info "Ожидание готовности приложения..."
MAX_ATTEMPTS=30
ATTEMPT=0
APP_READY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ] && [ "$APP_READY" = false ]; do
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        APP_READY=true
        log_success "Приложение готово"
    else
        ATTEMPT=$((ATTEMPT + 1))
        echo -n "."
        sleep 2
    fi
done
echo ""

if [ "$APP_READY" = false ]; then
    log_warning "Приложение не ответило на health check, но продолжаем..."
    log_info "Проверьте логи: $COMPOSE_CMD logs app"
else
    log_success "Приложение запущено и готово к работе"
fi

# Вывод информации
echo ""
echo "================================================"
log_success "Деплой завершен!"
echo "================================================"
echo ""
echo "Приложение доступно по адресу:"
echo "  - http://localhost:3000"
echo ""
echo "Полезные команды:"
echo "  Просмотр логов: $COMPOSE_CMD logs -f app"
echo "  Просмотр логов MySQL: $COMPOSE_CMD logs -f mysql"
echo "  Остановка: $COMPOSE_CMD down"
echo "  Перезапуск: $COMPOSE_CMD restart app"
echo ""
echo "Данные для входа в админ-панель:"
echo "  Email: admin"
echo "  Password: 12345678"
echo ""
echo "================================================"

