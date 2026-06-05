.PHONY: help build up down logs restart clean test shell rebuild prod prod-down

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@echo "  build       - Build Docker image"
	@echo "  up          - Start services"
	@echo "  down        - Stop services"
	@echo "  logs        - View logs"
	@echo "  restart     - Restart services"
	@echo "  clean       - Stop and remove containers, volumes"
	@echo "  rebuild     - Rebuild without cache"
	@echo "  shell       - Open shell in container"
	@echo "  test        - Test health endpoint"
	@echo "  prod        - Run production setup"
	@echo "  prod-down   - Stop production"

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f fitness-ai

restart:
	docker-compose restart

clean:
	docker-compose down -v
	docker system prune -f

rebuild:
	docker-compose build --no-cache
	docker-compose up -d

shell:
	docker-compose exec fitness-ai bash

test:
	curl http://localhost:5001/health || echo "Service not running"

prod:
	docker-compose -f docker-compose.prod.yml up -d --build

prod-down:
	docker-compose -f docker-compose.prod.yml down
