.PHONY: help dev test typecheck db-generate db-migrate swarm-init network-create build stack-deploy stack-rm up down

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

dev: ## Next.js dev server (http://localhost:3000)
	pnpm dev

test: ## Run unit tests
	pnpm test

typecheck: ## Type-check without emitting
	pnpm typecheck

db-generate: ## Generate the SQL migration from the TS schema
	pnpm db:generate

db-migrate: ## Apply migrations to SQLite
	pnpm db:migrate

swarm-init: ## Initialize Docker Swarm on this machine (1 node)
	docker swarm init || true

network-create: ## Create the shared external overlay network (run once)
	docker network create --driver overlay --attachable mini-dokploy-net || true

build: ## Build the mini-dokploy image
	docker build -t mini-dokploy:latest .

stack-deploy: ## Deploy the stack (Traefik + mini-dokploy)
	docker stack deploy -c docker/traefik.stack.yml mini-dokploy

stack-rm: ## Remove the stack
	docker stack rm mini-dokploy
	@echo "\n✓ Down. Stack removed."
	@echo "if you want to remove the network, run: docker network rm mini-dokploy-net"
	@echo "if you want to remove the volume, run docker volume rm mini-dokploy_mini-dokploy-dat"

up: swarm-init network-create build stack-deploy ## ONE COMMAND: bring the whole stack up
	@echo "\n✓ Up. App: http://dokploy.127.0.0.1.sslip.io  ·  Traefik: http://localhost:8080"

down: stack-rm ## Tear the stack down
