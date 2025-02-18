# Usar a imagem oficial do Node.js
FROM node:16

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências e instalar
COPY package*.json ./
RUN npm install
RUN apt-get update && apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libx11-xcb1 \
  libxcomposite1 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libnss3 \
  libnspr4 \
  libxss1 \
  fonts-liberation \
  libappindicator3-1 \
  libgdk-pixbuf2.0-0 \
  libxtst6 \
  libcurl4 \
  xdg-utils \
  --no-install-recommends

# Copiar o restante do código
COPY . .

# Expor a porta que o app vai usar
EXPOSE 3000

# Comando para rodar o app
CMD ["npm", "start"]
