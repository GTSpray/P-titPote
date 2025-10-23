none: help
cG=\033[0;32m
tR=\033[0m
tB=\033[1m
	
# OS detection
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
	OS := macos
	DC_CMD := docker-compose -f docker-compose.yml -f docker-compose.local.yml
	DC_CMD_DEV := $(DC_CMD) -f docker-compose.dev.yml
	DC_CMD_CI := $(DC_CMD_DEV) -f docker-compose.ci.yml 
else ifeq ($(OS),Windows_NT)
    OS := windows
	DC_CMD := docker-compose -f docker-compose.yml -f docker-compose.local.yml
	DC_CMD_DEV := $(DC_CMD) -f docker-compose.dev.yml
	DC_CMD_CI := $(DC_CMD_DEV) -f docker-compose.ci.yml 
else
	OS := linux
	DC_CMD := docker compose -f docker-compose.yml -f docker-compose.local.yml
	DC_CMD_DEV := $(DC_CMD) -f docker-compose.dev.yml
	DC_CMD_CI := $(DC_CMD_DEV) -f docker-compose.ci.yml 
endif

os:
	@echo "🫖 $(tB)P'titpote $(OS)$(tR)"
	@touch docker-compose.local.yml

## Help instructions
help: os
	@echo "\n $(tB)​Usage:$(tR)"
	@echo "\n  make $(cG)target$(tR)"
	@echo "\n $(tB)Available targets:$(tR)"
	@awk '/^[a-zA-Z\-\_0-9\.@]+:/ { \
		returnMessage = match(n4line, /^# (.*)/); \
		if (returnMessage) { \
			titleMessage = substr(n4line, 2, RLENGTH);\
			printf "\n  $(tB)%s$(tR)", titleMessage; \
		} \
		helpMessage = match(lastLine, /^## (.*)/); \
		if (helpMessage) { \
			helpCommand = substr($$1, 0, index($$1, ":")-1); \
			helpMessage = substr(lastLine, RSTART + 3, RLENGTH); \
			printf "\n     $(cG)%-10s$(tR)%s", helpCommand, helpMessage; \
		} \
	} \
	{ n5line = n4line; n4line = n3line; n3line = n2line; n2line = lastLine; lastLine = $$0;}' $(MAKEFILE_LIST)
	@echo ""

###
# Production
###

## Run containers
start: os
	$(DC_CMD) up -d --build --force-recreate --no-deps --remove-orphans

## Halt containers
stop: os
	$(DC_CMD_DEV) down --volumes

## Follow bot container logs
logs: os
	$(DC_CMD) logs -f  --no-log-prefix api gateway | jq -n -f recover.jq 

## Install slash commands on discord
register: os
	$(DC_CMD) run api npm run --silent register | jq

## Restart containers
restart: os
	$(DC_CMD) down --volumes
	@sleep 1
	$(DC_CMD) up -d --remove-orphans

## Migrate database up to the latest version
db-up: os
	$(DC_CMD) run api npx mikro-orm migration:up

## Migrate database one step down
db-down: os
	$(DC_CMD) run api npx mikro-orm migration:down

## Check if database schema is up to date
db-check: os
	$(DC_CMD) run api npx mikro-orm migration:check

###
# Developper
###

## Run containers as developpement mode
dev: os
	$(DC_CMD_DEV) run api npm ci
	$(DC_CMD_DEV) run api npm run build
	$(DC_CMD_DEV) up -d --remove-orphans

## Build with watch mode (need containers as developpement mode)
tsc: os
	$(DC_CMD_DEV) run api rm -Rf dist/*
	$(DC_CMD_DEV) run api npm run build -- -w

## Run tests with watch mode (need containers as developpement mode)
testw: os
	$(DC_CMD_DEV) run api npx vitest dev

## Format all files with Prettier (need containers as developpement mode)
pretty: os
	$(DC_CMD_DEV) run api npx prettier . --write

## Run shell inside bot container
sh: os
	$(DC_CMD) exec api bash

###
# ci
###

## Run containers as ci mode
ci: os
	$(DC_CMD_CI) run api npm ci
	$(DC_CMD_CI) run api npm run build
	$(DC_CMD_CI) up -d --remove-orphans

## Lint all files with Prettier
lint: os
	$(DC_CMD_CI) run api npx prettier . --check

## Run tests (need containers as developpement mode)
test: os
	$(DC_CMD_CI) run api npm --silent test