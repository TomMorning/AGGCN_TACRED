.PHONY: up down dev backend web build test seed-check

up:
	docker compose up -d
	@echo "Waiting for Postgres health..."
	@sleep 3
	@docker compose ps

down:
	docker compose down

backend:
	cd backend && go run ./cmd/server

web:
	cd web && npm run dev

dev:
	@echo "Start infra with: make up"
	@echo "Then in two terminals: make backend   &&   make web"
	@echo "Web: http://localhost:3000   API: http://localhost:8080"

build:
	cd backend && go build -o bin/server ./cmd/server
	cd web && npm run build

test:
	cd backend && go test ./...

seed-check:
	@docker compose exec -T postgres psql -U postgres -d archprobe -c "SELECT slug, is_free FROM scenarios ORDER BY is_free DESC, slug;"
