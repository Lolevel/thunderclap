# Prime League Scout - Makefile

.PHONY: help build up down logs shell db-shell test clean

help:
	@echo "Prime League Scout - Development Commands"
	@echo ""
	@echo "  make build          Build Docker images"
	@echo "  make up             Start all services"
	@echo "  make down           Stop all services"
	@echo "  make logs           Show logs (all services)"
	@echo "  make logs-backend   Show backend logs"
	@echo "  make shell          Open backend shell"
	@echo "  make db-shell       Open PostgreSQL shell"
	@echo "  make migrate        Run database migrations"
	@echo "  make test           Run tests"
	@echo "  make clean          Clean up containers and volumes"
	@echo ""

build:
	docker-compose build

up:
	docker-compose up -d
	@echo "Services started. Backend: http://localhost:5000"

down:
	docker-compose down

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-postgres:
	docker-compose logs -f postgres

shell:
	docker-compose exec backend /bin/bash

db-shell:
	docker-compose exec postgres psql -U pl_scout_user -d pl_scout

migrate:
	docker-compose exec backend flask db upgrade

test:
	docker-compose exec backend pytest

clean:
	docker-compose down -v
	@echo "Cleaned up containers and volumes"

restart:
	docker-compose restart backend

# Development helpers
dev-setup:
	cp backend/.env.example backend/.env
	@echo "Created .env file. Please edit backend/.env with your Riot API key"

dev-init: dev-setup build up
	@echo "Development environment initialized!"
	@echo "Backend: http://localhost:5000"
	@echo "Don't forget to add your Riot API key to backend/.env"
