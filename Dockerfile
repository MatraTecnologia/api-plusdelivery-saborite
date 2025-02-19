# Usar uma imagem base do Node.js 18
FROM node:18-buster

# Instalar dependências do sistema necessárias para o Playwright
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

# Definir o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copiar os arquivos de código fonte para dentro do container
COPY . .

# Instalar as dependências do Node.js
RUN npm install

# Rodar o comando de build do Next.js
RUN npm run build

# Expor a porta 3000 (padrão do Next.js)
EXPOSE 3000

# Comando para rodar a aplicação Next.js
CMD ["npm", "start"]
