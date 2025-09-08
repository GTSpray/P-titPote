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
else ifeq ($(OS),Windows_NT)
    OS := windows
	DC_CMD := docker-compose -f docker-compose.yml -f docker-compose.local.yml
	DC_CMD_DEV := $(DC_CMD) -f docker-compose.dev.yml
else
	OS := linux
	DC_CMD := docker compose -f docker-compose.yml -f docker-compose.local.yml
	DC_CMD_DEV := $(DC_CMD) -f docker-compose.dev.yml
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
	$(DC_CMD) down --volumes


## Install slash commands on discord
register: os
	$(DC_CMD) exec ptitpote npm run --silent register | jq

###
# Developper
###

## Run containers as developpement mode
dev: os
	$(DC_CMD_DEV) up -d --remove-orphans
	
## Build with watch mode (need containers as developpement mode)
build: os
	$(DC_CMD_DEV) exec ptitpote npm build

## Run tests (need containers as developpement mode)
test: os
	$(DC_CMD_DEV) exec ptitpote npm --silent test

## Run tests with watch mode (need containers as developpement mode)
testw: os
	$(DC_CMD_DEV) exec ptitpote npm run --silent test -- --watchAll

## Format all files with Prettier (need containers as developpement mode)
pretty: os
	$(DC_CMD_DEV) exec ptitpote npx prettier . --write


## Follow bot container logs
logs: os
	$(DC_CMD) logs -f  --no-log-prefix ptitpote | jq

## Restart containers
restart: os
	$(DC_CMD) down --volumes
	@sleep 1
	$(DC_CMD) up -d --remove-orphans

## Run shell inside bot container
sh: os
	$(DC_CMD) exec ptitpote bash