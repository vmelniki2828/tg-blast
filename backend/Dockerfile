FROM node:22-slim

# Chromium для whatsapp-web.js (если понадобится)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-noto-color-emoji \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src/ ./src/

EXPOSE 3001
CMD ["node", "src/index.js"]
