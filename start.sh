#!/bin/bash

# GoodDrive Startup Script
echo "🚀 Starting GoodDrive..."
echo ""

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Пожалуйста, установите Docker."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Пожалуйста, установите Docker Compose."
    exit 1
fi

# Проверка .env файла
if [ ! -f .env ]; then
    echo "⚠️  .env файл не найден. Создаем из .env.example..."
    cp .env.example .env
    echo "✓ .env файл создан. Пожалуйста, отредактируйте его при необходимости."
fi

echo "📦 Запуск Docker Compose..."
docker-compose up -d --build

echo ""
echo "⏳ Ожидание запуска MySQL..."
sleep 15

echo ""
echo "🎉 GoodDrive успешно запущен!"
echo ""
echo "🌐 Приложение доступно:"
echo "   - Frontend/Backend: http://localhost:3000"
echo "   - PhpMyAdmin: http://localhost:8080"
echo ""
echo "👤 Учетные данные администратора:"
echo "   Email: admin"
echo "   Password: 12345678"
echo ""
echo "📊 Для просмотра логов используйте:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Для остановки используйте:"
echo "   docker-compose down"
echo ""

