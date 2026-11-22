Software Factory Workshop Repository
====================================


This is a base repository for the interactive _Agentic Software Factory Workshop_. 

## Prerequisites


- Docker desktop (<https://www.docker.com/products/docker-desktop/>)
- GNU `make` 3.81, or a compatible `make`.
- git command line tools 
- A Claude subscription or an Anthropic API key

`make` and `git` should be available out of the box on most Linux machines. For MacOS machines, make sure xcode command line tools are installed, or set up `make` and `git` using your package manager (brew has recipes for both). On Windows, you will need WSL2 and a Unix Shell (WSL Terminal).

Run `docker --version`, `git --version` and `make --version` from your command line to check if the prerequisites are installed. 

## Setting up the workspace

1. Clone this repository
2. Open the clone directory in a terminal
3. Make sure Docker desktop is running 
4. Run `make init` from the clone directory - note that this may take a while as it's downloading and installing a bunch of things.

## Testing the installation

1. From the clone directory in a terminal, run `make shell-workspace`; this should create a new Docker container and show a prompt starting with `(workspace)`. 
2. Run `make start`; this should show a message that it started a web server on port 8080. 
3. Open `http://localhost:8080/` in your browser, you should see a hello world message.
4. stop the server using `Ctrl+c`, then run `exit` to quit the container

## Testing Claude Code setup


1. If you are using an Anthropic API key (not a Claude subscription), export it to your environment using `export ANTHROPIC_API_KEY=...`. If you are using a Claude subscription, this is not necessary.
2. Run `make claude-workspace`; this should start a new Docker container and open a new Claude code instance.
3. If you are using a Claude subscription (not using an Anthropic API key),
   Claude will ask you to log in.  Because it's running in a container, it will
   not be able to automatically open a browser. Instead, it will print an URL
   for you to copy/paste in a browser (press C to copy it), then authorize
     access and copy/paste the resulting code back into the terminal.
4. Tell Claude to start the web server (e.g. `start the web server`)
5. Open `http://localhost:8080/` in your browser, you should see a hello world message.
6. Stop Claude by using `Ctrl+C` twice

## Troubleshooting 

- if port 8080 is already taken on your machine, add `LOCAL_PORT=<ANOTHER PORT>` to the make commands. E.g. `make claude-workspace LOCAL_PORT=9090` to run the web server on port 9090 locally.
- if you see "Cannot connect to the Docker daemon", make sure that Docker is actually running
- Linux without Docker Desktop (with an alternative docker runner) may fail to write to `workspace/` or `.claude-home/`. Try using Docker desktop if possible, or if not update the directory writing rights
- If you get permission access problems on Windows, make sure the clone is in the WSL file system (`https://learn.microsoft.com/en-us/windows/wsl/filesystems`)
