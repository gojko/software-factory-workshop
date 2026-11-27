ARG BASE_IMAGE
FROM ${BASE_IMAGE}

USER root

RUN apk add --no-cache \
  chromium nss freetype harfbuzz ca-certificates ttf-freefont ffmpeg

RUN ln -sf "$(command -v chromium || command -v chromium-browser)" /usr/local/bin/chromium \
  && /usr/local/bin/chromium --headless --no-sandbox --version

ENV CHROME_PATH=/usr/local/bin/chromium \
  PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/chromium \
  PUPPETEER_SKIP_DOWNLOAD=true \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  PLAYWRIGHT_BROWSERS_PATH=0

USER builder
