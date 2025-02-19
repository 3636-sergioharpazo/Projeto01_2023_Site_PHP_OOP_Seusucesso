// index_ceece_vps.js (ou arquivo correspondente ao seu servidor)

const express = require('express');
const app = express();

// Porta configurada via variável de ambiente ou padrão 3002
const port = process.env.PORT || 3002;  // Use 3003 ou outra porta caso 3002 esteja ocupada

// Defina suas rotas e middlewares aqui
app.get('/', (req, res) => {
  res.send('Página inicial do servidor!');
});

// Inicie o servidor na porta configurada
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
