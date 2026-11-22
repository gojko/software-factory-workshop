MAKEFILE_DIR:=$(dir $(abspath $(lastword $(MAKEFILE_LIST))))
PROJECT=$(abspath $(MAKEFILE_DIR))
CONTAINER_PORT ?= 8080
CONTAINER_SHM_SIZE ?= 4gb
LOCAL_PORT ?= 8080
HOST_ARCH := $(shell uname -m)
DOCKER_ARCH := $(if $(filter x86_64 amd64,$(HOST_ARCH)),amd64,$(if $(filter aarch64 arm64,$(HOST_ARCH)),arm64,$(HOST_ARCH)))
DOCKER_PLATFORM ?= linux/$(DOCKER_ARCH)
DOCKER_IMAGE_NAME ?= gojko.net/software-factory-workshop
CLAUDE_HOME := $(PROJECT)/.claude-home

FACTORY_REPO ?= https://github.com/gojko/lights-on-software-factory.git
FACTORY_BRANCH ?= master
FACTORY_DIR := factory-setup
WORKSPACE_DIR := workspace
TEMPLATE_DIR := app-template
FACTORY_IMAGE_DIR := $(FACTORY_DIR)/vm
DOCKER_IMAGE_DIR := vm

FACTORY_IMAGE_NAME ?= $(shell env -u DOCKER_IMAGE_NAME -u MAKEFLAGS -u MFLAGS \
	$(MAKE) -pnq --no-print-directory -f $(FACTORY_DIR)/makefile 2>/dev/null \
	| sed -n 's/^DOCKER_IMAGE_NAME [:?]*= *//p')

help: ## Show the targets and what each one does
	@awk 'BEGIN { FS = ":.*## " } /^[a-zA-Z_-]+:.*## / { printf "  %-22s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

$(FACTORY_DIR):
	git clone --branch $(FACTORY_BRANCH) $(FACTORY_REPO) $@

update-factory: | $(FACTORY_DIR) ## Pull the newest factory set-up
	git -C $(FACTORY_DIR) pull --ff-only origin $(FACTORY_BRANCH)

factory-image: | $(FACTORY_DIR) ## Build the base container image from the factory set-up, with the image name from the factory makefile
	@test -n "$(FACTORY_IMAGE_NAME)" || { echo "Cannot read DOCKER_IMAGE_NAME from $(FACTORY_DIR)/makefile; set FACTORY_IMAGE_NAME" >&2; exit 1; }
	docker build --platform $(DOCKER_PLATFORM) -t $(FACTORY_IMAGE_NAME) $(FACTORY_IMAGE_DIR)

docker-image: factory-image ## Build the workshop container image (the factory image plus Chromium) from vm/Dockerfile
	docker build --platform $(DOCKER_PLATFORM) \
		--build-arg BASE_IMAGE=$(FACTORY_IMAGE_NAME) \
		-t $(DOCKER_IMAGE_NAME) $(DOCKER_IMAGE_DIR)

$(CLAUDE_HOME):
	mkdir -p $@

RSYNC_EXCLUDES=--checksum --exclude node_modules/ --exclude .git
FACTORY_DEMO_EXCLUDES=--exclude /src/ --exclude /tests/ --exclude '/plans/*.md' --exclude /package-lock.json
GIT_USER_NAME ?= builder
GIT_USER_EMAIL ?= builder@localhost

CONTAINER_PROJECT := /builder
CONTAINER_WORKSPACE := $(CONTAINER_PROJECT)/$(WORKSPACE_DIR)
GIT_SAFE_DIR := -eGIT_CONFIG_COUNT=1 -eGIT_CONFIG_KEY_0=safe.directory -eGIT_CONFIG_VALUE_0=$(CONTAINER_WORKSPACE)

WORKSPACE_MOUNT = -v $(PROJECT)/$(WORKSPACE_DIR):$(CONTAINER_WORKSPACE) \
		-w $(CONTAINER_WORKSPACE) \
		-ePROJECT=$(CONTAINER_PROJECT) \
		$(GIT_SAFE_DIR)

init: docker-image | $(FACTORY_DIR) $(TEMPLATE_DIR) ## Build the image, then sync the factory workspace and the app template into the workspace (template wins) and install its dependencies; safe to re-run
	docker run --rm \
		--platform $(DOCKER_PLATFORM) \
		-v $(PROJECT):$(CONTAINER_PROJECT) \
		-w $(CONTAINER_PROJECT) \
		$(GIT_SAFE_DIR) \
		--entrypoint /bin/bash \
		$(DOCKER_IMAGE_NAME) -ec "\
			if [ ! -d $(WORKSPACE_DIR) ]; then \
				git init -q -b main $(WORKSPACE_DIR) && \
				git -C $(WORKSPACE_DIR) config user.name '$(GIT_USER_NAME)' && \
				git -C $(WORKSPACE_DIR) config user.email '$(GIT_USER_EMAIL)'; \
			fi && \
			rsync -a $(RSYNC_EXCLUDES) $(FACTORY_DEMO_EXCLUDES) $(FACTORY_DIR)/workspace/ $(WORKSPACE_DIR)/ && \
			rsync -a $(RSYNC_EXCLUDES) $(TEMPLATE_DIR)/ $(WORKSPACE_DIR)/ && \
			if ! git -C $(WORKSPACE_DIR) rev-parse --verify --quiet HEAD > /dev/null; then \
				git -C $(WORKSPACE_DIR) add -A && \
				git -C $(WORKSPACE_DIR) commit -q -m 'Initial workspace'; \
			fi"
	docker run --rm \
		--platform $(DOCKER_PLATFORM) \
		$(WORKSPACE_MOUNT) \
		--entrypoint /usr/bin/make \
		$(DOCKER_IMAGE_NAME) init

$(WORKSPACE_DIR):
	$(MAKE) init

WORKSPACE_DOCKER_CMD=docker run --rm \
		--platform $(DOCKER_PLATFORM) \
		$(WORKSPACE_MOUNT) \
		--shm-size=$(CONTAINER_SHM_SIZE) \
		-p $(LOCAL_PORT):$(CONTAINER_PORT)/tcp \
		-e CONTAINER_PORT=$(CONTAINER_PORT)

claude-workspace: | $(CLAUDE_HOME) $(WORKSPACE_DIR) ## Launch Claude Code in a container with the workspace mounted
	$(WORKSPACE_DOCKER_CMD) \
		-e ANTHROPIC_API_KEY \
		-v $(CLAUDE_HOME):$(CONTAINER_PROJECT)/.claude \
		-eCLAUDE_CONFIG_DIR=$(CONTAINER_PROJECT)/.claude \
		--entrypoint /bin/bash \
		-it $(DOCKER_IMAGE_NAME) -ic claude


shell-workspace: | $(WORKSPACE_DIR) ## Open a shell in a container with the workspace mounted
	$(WORKSPACE_DOCKER_CMD) \
		-e PS1="(workspace) [\t] \w/ $$ " \
		-it $(DOCKER_IMAGE_NAME)

clean-workspace: ## Delete the workspace; the factory set-up and the template stay
	rm -rf $(WORKSPACE_DIR)


root: ## Open a root shell in the container image, mounting the workspace; useful only for configuring the workshop setup itself. Do not run under regular usage
	docker run --rm \
		--platform $(DOCKER_PLATFORM) \
		-v $(PROJECT):$(CONTAINER_PROJECT) \
		-w $(CONTAINER_PROJECT) \
		-ePROJECT=$(CONTAINER_PROJECT) \
		$(GIT_SAFE_DIR) \
		--shm-size=$(CONTAINER_SHM_SIZE) \
		-u 0 \
		-it $(DOCKER_IMAGE_NAME)

.PHONY: help init update-factory factory-image docker-image claude-workspace shell-workspace clean-workspace root
