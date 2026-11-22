export PATH := $(CURDIR)/node_modules/.bin:$(PATH)

PROJECT_TESTS := --selectProjects unit integration

.PHONY: help init start test test-unit test-integration test-changed test-tooling lint workflow-serial-gate workflow-final-gate

help: ## Show the targets and what each one does
	@awk 'BEGIN { FS = ":.*## " } /^[a-zA-Z_-]+:.*## / { printf "  %-22s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

init: ## Install the dependencies exactly as package-lock.json lists them; fails if it does not match package.json
	npm ci

start: ## Start the web app on $CONTAINER_PORT (the container launch sets it)
	node src/server.js

test: ## Run the project unit and integration tests (src/ and tests/)
	jest $(PROJECT_TESTS)

test-unit: ## Run the project unit tests (tests/*.test.js, without *.integration.test.js)
	jest --selectProjects unit

test-integration: ## Run the project integration tests (tests/*.integration.test.js)
	jest --selectProjects integration

test-changed: ## Run the unit tests related to the files changed since the last commit (every unit test when there is no commit)
	@if git rev-parse --verify --quiet HEAD > /dev/null; then \
		jest --selectProjects unit --onlyChanged; \
	else \
		echo "git cannot read a commit to compare with, so every unit test runs"; \
		jest --selectProjects unit; \
	fi

test-tooling: ## Run the workflow tooling tests (.claude/workflow/)
	jest --selectProjects tooling

lint: ## Lint the whole project
	eslint .

workflow-serial-gate: lint test-changed ## Run lint and the changed unit tests; gate agents run it between the groups of a flow
	@echo "=== The serial gate is green ==="

workflow-final-gate: lint test test-tooling ## Run lint and every unit, integration and tooling test; a gate agent runs it once, at the end of a flow
	@echo "=== The final gate is green ==="
