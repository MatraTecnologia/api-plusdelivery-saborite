# Use a imagem do Node.js
FROM node:16-buster

# Instalar dependências para o Playwright
RUN apt-get update && apt-get install -y \
  wget \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  libgbm1 \
  && rm -rf /var/lib/apt/lists/*

# Crie e entre no diretório do projeto
WORKDIR /usr/src/app

# Copie os arquivos de projeto
COPY . .

# Instalar dependências do Node.js
RUN npm install

# Comando para rodar a aplicação
CMD ["npm", "start"]
