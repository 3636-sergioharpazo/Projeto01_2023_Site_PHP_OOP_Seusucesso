# Usa a imagem oficial do Node.js
FROM node:18

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código para o contêiner
COPY . .

# Expondo a porta usada pelo app
EXPOSE 3002

# Comando para iniciar a aplicação
CMD ["node", "index_ceece.js"]
