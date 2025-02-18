# Usar a imagem oficial do Node.js
FROM node:16

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências e instalar
COPY package*.json ./
RUN npm install

# Copiar o restante do código
COPY . .

# Expor a porta que o app vai usar
EXPOSE 3000

# Comando para rodar o app
CMD ["npm", "start"]
