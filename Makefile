.PHONY: help build up down restart logs clean seed dev prod status

help: ## Показать справку
	@echo "GoodDrive - Команды управления"
	@echo ""
	@echo "Доступные команды:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Собрать Docker образы (production)
	docker compose build

up: ## Запустить все сервисы (production)
	docker compose up -d
	@echo "✓ Сервисы запущены"
	@echo "  - App: http://localhost:3000"
	@echo "  - Nginx: http://localhost:80"

down: ## Остановить все сервисы
	docker compose down

restart: down up ## Перезапустить все сервисы

logs: ## Показать логи
	docker compose logs -f

clean: ## Удалить контейнеры и volumes
	docker compose down -v --remove-orphans
	@echo "✓ Контейнеры и данные удалены"

clean-orphans: ## Удалить orphan контейнеры
	docker compose down --remove-orphans
	@echo "✓ Orphan контейнеры удалены"

seed: ## Заполнить БД тестовыми данными
	docker compose exec app npm run db:seed

dev: ## Запустить в dev режиме
	docker compose -f docker-compose.dev.yml up -d
	@echo "✓ Dev режим запущен"
	@echo "  - App: http://localhost:3000"
	@echo "  - PhpMyAdmin: http://localhost:8080"

prod: build up ## Production запуск

status: ## Показать статус контейнеров
	docker compose ps

