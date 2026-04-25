.PHONY: help install run stop restart logs status provision provision-person refresh-session deploy setup-oidc

help:
	@printf "\n\033[1m  bunq Platform — available commands\033[0m\n"
	@printf "  ──────────────────────────────────────────────────────\n"
	@printf "  \033[36m%-22s\033[0m %s\n" "make run"              "Start all services (detached)"
	@printf "  \033[36m%-22s\033[0m %s\n" "make stop"             "Stop all services"
	@printf "  \033[36m%-22s\033[0m %s\n" "make restart"          "Restart all services"
	@printf "  \033[36m%-22s\033[0m %s\n" "make logs"             "Follow service logs"
	@printf "  \033[36m%-22s\033[0m %s\n" "make status"           "Container health + URLs"
	@printf "  \033[36m%-22s\033[0m %s\n" "make install"          "Rebuild images (after npm changes)"
	@printf "  \033[36m%-22s\033[0m %s\n" "make provision"        "Provision bunq sandbox (company)"
	@printf "  \033[36m%-22s\033[0m %s\n" "make provision-person" "Provision bunq sandbox (person)"
	@printf "  \033[36m%-22s\033[0m %s\n" "make refresh-session"  "Refresh expired bunq session token"
	@printf "  \033[36m%-22s\033[0m %s\n" "make deploy"           "Deploy everything to AWS (needs AWS env vars)"
	@printf "  \033[36m%-22s\033[0m %s\n" "make setup-oidc"       "One-time: configure GitHub OIDC → IAM role"
	@printf "\n"

install:
	docker compose build backend mastra frontend

run:
	docker compose up -d --force-recreate backend mastra

stop:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

provision:
	node scripts/bunq-provision.mjs
	docker compose up -d --force-recreate backend mastra

provision-person:
	node scripts/bunq-provision.mjs --user-type person
	docker compose up -d --force-recreate backend mastra

refresh-session:
	node scripts/bunq-provision.mjs --refresh-session
	docker compose up -d --force-recreate backend mastra

status:
	@printf "\n\033[1m  bunq Platform\033[0m\n"
	@printf "  ──────────────────────────────────────────────────────\n"
	@docker compose ps --format "  {{.Name}}\t{{.State}}\t{{.Status}}" 2>/dev/null
	@printf "\n\033[1m  URLs\033[0m\n"
	@printf "  ──────────────────────────────────────────────────────\n"
	@printf "  \033[36m%-22s\033[0m %s\n" "Frontend (UI)"        "http://localhost:9292"
	@printf "  \033[36m%-22s\033[0m %s\n" "Backend API"          "http://localhost:9191"
	@printf "  \033[36m%-22s\033[0m %s\n" "Health check"         "http://localhost:9191/health"
	@printf "  \033[36m%-22s\033[0m %s\n" "Mastra Studio"        "http://localhost:4111"
	@printf "  \033[36m%-22s\033[0m %s\n" "MinIO Console"        "http://localhost:9001  (minioadmin / minioadmin)"
	@printf "  \033[36m%-22s\033[0m %s\n" "MinIO API (S3)"       "http://localhost:9000/bunq-events"
	@printf "\n"

deploy:
	@bash scripts/deploy.sh $(ARGS)

# One-time OIDC setup — requires --github-org and --github-repo args:
#   make setup-oidc ARGS="--github-org yourorg --github-repo bunq"
setup-oidc:
	@bash scripts/setup-github-oidc.sh $(ARGS)
