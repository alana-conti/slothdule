# Slothdule — atalhos do dia a dia.
# `make help` lista tudo.
#
# Produção (`make prod`): SSH_HOST, SSH_USER, SSH_KEY_FILE e DEPLOY_DIR no
# ambiente; GHCR_OWNER obrigatório; API_TAG/WEB_TAG pinam a versão
# (default: latest). GHCR_USER/GHCR_TOKEN p/ pulls privados.

COMPOSE_DEV := docker compose -f docker-compose.yml -f docker-compose.dev.yml
PY := $(if $(wildcard .venv-backend/bin/python),.venv-backend/bin/python,python3)
TEST_DB_URL ?= postgresql+psycopg://slothdule:slothdule@localhost:5434/slothdule_test
TEST_PG := slothdule-test-postgres
GHCR_OWNER ?= $(error defina GHCR_OWNER=owner-do-github)
API_TAG ?= latest
WEB_TAG ?= latest

.PHONY: help setup dev down logs ps build test test-backend test-frontend lint typecheck migrate db-shell backup clean prod

prod: ## Atualiza a VPS com as imagens do GHCR (API_TAG/WEB_TAG pinam versão)
	ssh -i "$(SSH_KEY_FILE)" "$(SSH_USER)@$(SSH_HOST)" \
		"cd '$(DEPLOY_DIR)' && git pull --ff-only origin main && \
		API_IMAGE='ghcr.io/$(GHCR_OWNER)/slothdule:api-$(API_TAG)' \
		WEB_IMAGE='ghcr.io/$(GHCR_OWNER)/slothdule:web-$(WEB_TAG)' \
		GHCR_USER='$(GHCR_USER)' GHCR_TOKEN='$(GHCR_TOKEN)' ./scripts/deploy.sh"

help: ## Lista os comandos disponíveis
	@grep -E '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-13s\033[0m %s\n", $$1, $$2}'

setup: ## Instala dependências do frontend e do backend + hooks git
	npm install
	python3 -m venv .venv-backend
	.venv-backend/bin/pip install -r backend/requirements.txt
	command -v lefthook >/dev/null || brew install lefthook
	lefthook install

dev: ## Sobe tudo em modo dev (db + api + web com hot reload)
	$(COMPOSE_DEV) up db api web

down: ## Para a stack de dev (mantém banco e arquivos)
	$(COMPOSE_DEV) down

logs: ## Segue logs (use S=api|web|db para filtrar, ex.: make logs S=api)
	$(COMPOSE_DEV) logs -f $(S)

ps: ## Mostra o estado dos containers
	$(COMPOSE_DEV) ps

build: ## Builda as imagens docker (api + web)
	docker compose build

test: test-backend test-frontend ## Roda toda a suíte (backend + frontend)

test-backend: ## Pytest contra Postgres (local: container efêmero na 5434; CI: service do workflow via TEST_DATABASE_URL)
ifndef TEST_DATABASE_URL
	@docker start $(TEST_PG) 2>/dev/null || docker run -d --name $(TEST_PG) -e POSTGRES_USER=slothdule -e POSTGRES_PASSWORD=slothdule -p 5434:5432 postgres:17-alpine
	@i=0; until docker exec $(TEST_PG) psql -U slothdule -d postgres -tc "SELECT 1" 2>/dev/null | grep -q 1; do i=$$((i+1)); if [ $$i -ge 90 ]; then echo "postgres de teste não respondeu em 90s"; docker logs --tail 20 $(TEST_PG); exit 1; fi; sleep 1; done
	@docker exec $(TEST_PG) psql -U slothdule -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='slothdule_test'" | grep -q 1 || docker exec $(TEST_PG) psql -U slothdule -d postgres -c "CREATE DATABASE slothdule_test" >/dev/null
endif
	@TEST_DATABASE_URL="$(or $(TEST_DATABASE_URL),$(TEST_DB_URL))" JWT_SECRET=test-secret DATA_DIR=/tmp/slothdule-test-data $(PY) -m pytest backend/tests

test-frontend: ## Vitest (unitários do frontend)
	npx vitest run

lint: ## ESLint do frontend
	npm run lint

typecheck: ## tsc --noEmit do frontend
	npm run typecheck

migrate: ## Aplica migrações Alembic no banco da stack (precisa do `api` no ar)
	docker compose exec api alembic upgrade head

db-shell: ## Abre psql no banco da stack
	docker compose exec db psql -U slothdule -d slothdule

backup: ## Backup do banco + anexos (DEST=./backups por padrão)
	./scripts/backup.sh $(or $(DEST),./backups)

clean: ## Para tudo e APAGA volumes (banco + arquivos) e o Postgres de teste
	$(COMPOSE_DEV) down -v
	@docker rm -f slothdule-test-postgres 2>/dev/null || true
