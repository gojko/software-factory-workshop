export PATH := $(CURDIR)/node_modules/.bin:$(PATH)

PROJECT_TESTS := --selectProjects unit integration browser

.PHONY: help init build start test test-unit test-integration test-changed test-tooling test-db clean-db lint workflow-serial-gate workflow-final-gate

help: ## Show the targets and what each one does
	@awk 'BEGIN { FS = ":.*## " } /^[a-zA-Z_-]+:.*## / { printf "  %-22s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

init: ## Install the dependencies 
	npm install

build: ## Bundle the browser code of src/www/ into public/dist/
	node src/www/build.js

start: build ## Start the web app on $CONTAINER_PORT (the container launch sets it)
	node src/server.js

test: ## Run the project unit and integration tests (src/ and tests/)
	jest $(PROJECT_TESTS)

test-unit: ## Run the project unit tests (tests/*.test.js, without *.integration.test.js) and the jsdom browser tests
	jest --selectProjects unit browser

test-integration: ## Run the project integration tests (tests/*.integration.test.js)
	jest --selectProjects integration

test-changed: ## Run the unit tests related to the files changed since the last commit (every unit test when there is no commit)
	@if git rev-parse --verify --quiet HEAD > /dev/null; then \
		jest --selectProjects unit browser --onlyChanged; \
	else \
		echo "git cannot read a commit to compare with, so every unit test runs"; \
		jest --selectProjects unit browser; \
	fi

test-tooling: ## Run the workflow tooling tests (.claude/workflow/)
	jest --selectProjects tooling

test-db: ## Reset the test database to its seeded state (src/db/reset-test-db.js)
	node src/db/reset-test-db.js

DB_FILE ?= data/hotel.db

clean-db: ## Drop the database completely: delete $(DB_FILE) (default data/hotel.db) and its journal, wal and shm files
	rm -f $(DB_FILE) $(DB_FILE)-journal $(DB_FILE)-wal $(DB_FILE)-shm

lint: ## Lint the whole project
	eslint .

workflow-serial-gate: lint test-changed ## Run lint and the changed unit tests; gate agents run it between the groups of a flow
	@echo "=== The serial gate is green ==="

workflow-final-gate: lint test test-tooling ## Run lint and every unit, integration and tooling test; a gate agent runs it once, at the end of a flow
	@echo "=== The final gate is green ==="
