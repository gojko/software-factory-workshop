Software Factory Workshop Repository
====================================


This is a base repository for the interactive _Agentic Software Factory Workshop_. 

## Prerequisites

- Docker desktop (<https://www.docker.com/products/docker-desktop/>)
- GNU `make` 3.81, or a compatible `make`. `make` should be available out of the box on most Linux machines, and MacOS machines with xcode command line tools installed. Run `make --version` from your command line to check if it is installed. 
- Claude Code API key (any Claude subscription or API access should be sufficient)

## Setting up the workspace

1. Clone this repository
2. Open the clone directory in a terminal
3. Make sure `docker` and `make` are installed and available (commands `docker --version` and `make --version` should execute without errors)
4. Run `make init` from the clone directory

## Testing the installation

1. From the clone directory in a terminal, run `make shell-workspace`; this should create a new Docker container and show a prompt starting with `(workspace)`. 
2. Run `make start`; this should show a message that it started a web server on port 8080. 
3. Open `http://localhost:8080/` in your browser, you should see a hello world message.
4. stop the server using `Ctrl+c`, then run `exit` to quit the container

## Testing Claude Code setup


1a. If you are using an Anthropic subscription, run `make claude-workspace`; this should start a new Docker container and open a new Claude code instance, asking you to log in. Log in.
1b. If you are using an Anthropic API key, run `make claude-workspace ANTHROPIC_API_KEY=<YOUR API KEY>`. This should open a new Claude code instance without the requirement to log in.
2. tell Claude to start the web server (e.g. `start the web server`)
3. Open `http://localhost:8080/` in your browser, you should see a hello world message.
4. Stop claude by using `Ctrl+C` twice


## Troubleshooting 

- if port 8080 is already taken on your machine, add `LOCAL_PORT=<ANOTHER PORT>` to the make commands. E.g. `make claude-workspace LOCAL_PORT=9090` to run the web server on port 9090 locally.

