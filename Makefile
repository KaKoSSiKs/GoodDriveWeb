.PHONY: help build up down restart logs clean seed

help: ## Показать справку
	@echo "GoodDrive - Команды управления"
	@echo ""
	@echo "Доступные команды:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Собрать Docker образы
	docker-compose build

up: ## Запустить все сервисы
	docker-compose up -d
	@echo "✓ Сервисы запущены"
	@echo "  - App: http://localhost:3000"
	@echo "  - PhpMyAdmin: http://localhost:8080"

down: ## Остановить все сервисы
	docker-compose down

restart: down up ## Перезапустить все сервисы

logs: ## Показать логи
	docker-compose logs -f

clean: ## Удалить контейнеры и volumes
	docker-compose down -v
	@echo "✓ Контейнеры и данные удалены"

seed: ## Заполнить БД тестовыми данными
	docker-compose exec app npm run db:seed

dev: ## Запустить в dev режиме
	docker-compose -f docker-compose.dev.yml up -d
	@echo "✓ Dev режим запущен"
	@echo "  - App: http://localhost:3000"

prod: build up ## Production запуск

status: ## Показать статус контейнеров
	docker-compose ps

