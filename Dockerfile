# Use uma imagem base do Node.js
FROM node:18-alpine

# Defina o diretório de trabalho no container
WORKDIR /app

# Copie os arquivos do projeto para o container
COPY package*.json ./
RUN npm install

# Copie o restante do código
COPY . .

# Exponha a porta usada pelo app
EXPOSE 3002

# Comando para iniciar o app
CMD ["npm", "start"]
