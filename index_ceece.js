const axios = require('axios');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const qrcodeWeb = require('qrcode');
const express = require('express');

const app = express();
const port = 3002;

const client = new Client({
  authStrategy: new LocalAuth(),
});

let qrCodeImage = "";
let connectionStatus = "Desconectado"; // Inicializa como desconectado

// Geração do QR Code para terminal e imagem
function generateQRCode() {
  return new Promise((resolve, reject) => {
    client.on('qr', (qr) => {
      qrcode.toString(qr, { small: true }, (err, qrCode) => {
        if (!err) {
          console.log(qrCode); // Exibe o QR code no terminal
        }
      });

      // Geração do QR Code para imagem
      qrcodeWeb.toDataURL(qr, (err, url) => {
        if (!err) {
          qrCodeImage = url; // Armazena a URL da imagem do QR code
          resolve(url); // Resolve a promise com a URL do QR Code
        } else {
          reject('Erro ao gerar QR Code para imagem');
        }
      });
    });
  });
}

// Quando o cliente estiver pronto
client.on('ready', () => {
  console.log('Tudo certo! WhatsApp conectado.');
  connectionStatus = 'Conectado'; // Atualiza para conectado
});

// Quando o cliente se desconectar
client.on('disconnected', () => {
  console.log('Bot desconectado.');
  connectionStatus = 'Desconectado'; // Atualiza para desconectado
  generateQRCode(); // Gera novamente o QR Code quando desconectado
});

// Inicializa o cliente
client.initialize();

// Rota HTTP
app.get("/", async (req, res) => {
  try {
    if (!qrCodeImage) {
      await generateQRCode(); // Gera o QR Code se não houver
    }

    if (connectionStatus === 'Conectado') {
      return res.send(`
        <html>
          <head>
            <title>Conectado ao WhatsApp</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <script>
              setTimeout(() => {
                location.reload();
              }, 30000);
            </script>
          </head>
          <body class="d-flex flex-column align-items-center justify-content-center vh-100 text-center">
            <div class="container">
              <h1 class="text-success">Você está conectado ao WhatsApp!</h1>
              <p class="lead">O seu WhatsApp foi conectado com sucesso.</p>
            </div>
          </body>
        </html>
      `);
    }

    res.send(`
      <html>
        <head>
          <title>QR Code WhatsApp</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <script>
            setTimeout(() => {
              location.reload();
            }, 30000);
          </script>
        </head>
        <body class="d-flex flex-column align-items-center justify-content-center vh-100 text-center">
          <div class="container">
            <h1 class="text-success">Escaneie o QR Code para conectar</h1>
            <img src="${qrCodeImage}" class="img-fluid my-3" alt="QR Code" />
            <div class="status fs-4 fw-bold ${connectionStatus === 'Conectado' ? 'text-success' : 'text-danger'}">
              ${connectionStatus}
            </div>
            <div class="status-alert mt-2 fs-5 ${connectionStatus === 'Conectado' ? 'text-success' : 'text-danger'}">
              ${connectionStatus === 'Conectado' ? 'Você está conectado ao WhatsApp!' : 'Conecte seu WhatsApp escaneando o código.'}
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.send('Erro ao gerar QR Code');
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

// Evento quando a conexão for estabelecida com o celular
client.on('authenticated', () => {
  console.log('📲 WhatsApp conectado ao celular!');
});

// Função para criar delay
const delay = ms => new Promise(res => setTimeout(res, ms));

const clientesRespondidos = {}; // Cache para armazenar clientes que já responderam

client.on('message', async (msg) => {
  if (!msg.from.endsWith('@c.us')) return;

  if (/^(menu|Menu|oi|Oi|Olá|olá|ola)$/i.test(msg.body)) {
    const chat = await msg.getChat();
    const contact = await msg.getContact();
    const name = contact.pushname || 'Cliente';

    await delay(2000);
    await chat.sendStateTyping();
    await delay(2000);

    // Chama o servidor PHP para enviar o menu
    await axios.get(`http://localhost:3002/index.php?action=menu&to=${msg.from}`)
      .then(response => {
        client.sendMessage(msg.from, response.data);
      })
      .catch(error => {
        client.sendMessage(msg.from, "Erro ao carregar o menu. Tente novamente mais tarde.");
      });
  }

  if (msg.body.trim() === '1') {
    // Chama o servidor PHP para enviar o cardápio
    await axios.get(`http://localhost:3002/index.php?action=cardapio&to=${msg.from}`)
      .then(response => {
        client.sendMessage(msg.from, response.data);
      })
      .catch(error => {
        client.sendMessage(msg.from, "Erro ao carregar o cardápio. Tente novamente mais tarde.");
      });
  }

  if (msg.body.trim() === '2') {
    // Envia a solicitação para o cliente fazer um pedido
    await client.sendMessage(
      msg.from,
      'Para fazer seu pedido, digite o número do prato seguido pela quantidade, por exemplo:\n' +
      '1. Picanha 2\n' +
      '2. Fraldinha 3\n' +
      'Ou digite *Voltar* para retornar ao menu anterior.'
    );
  }

  if (/^\d+\.\s?\w+\s?\d+$/i.test(msg.body)) {
    // Processa o pedido com a sintaxe "1:2,3:1" e envia ao PHP
    const pedido = msg.body.replace(/[^0-9,:]/g, ''); // Filtra caracteres não válidos
    await axios.get(`http://localhost:3002/index.php?action=pedido&to=${msg.from}&pedido=${pedido}`)
      .then(response => {
        client.sendMessage(msg.from, response.data);
      })
      .catch(error => {
        client.sendMessage(msg.from, "Erro ao processar o pedido. Tente novamente.");
      });
  }

  if (msg.body.trim().toLowerCase() === 'confirmar') {
    await client.sendMessage(msg.from, "Pedido confirmado! Aguardando preparo. Obrigado por escolher a *Churrascaria Ceece Gril*!");
  }

  if (msg.body.trim().toLowerCase() === 'voltar') {
    await client.sendMessage(msg.from, "Voltando ao menu principal...");
    await axios.get(`http://localhost:3002/index.php?action=menu&to=${msg.from}`)
      .then(response => {
        client.sendMessage(msg.from, response.data);
      })
      .catch(error => {
        client.sendMessage(msg.from, "Erro ao voltar ao menu principal.");
      });
  }
});
