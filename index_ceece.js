// Importações
const qrcode = require('qrcode-terminal'); // qrcode para terminal
const qrcodeWeb = require("qrcode"); // qrcode para imagem web
const axios = require('axios');
const { Client, LocalAuth } = require('whatsapp-web.js'); // Adicionado LocalAuth
const express = require("express");

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
    client.on("qr", (qr) => {
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
          reject("Erro ao gerar QR Code para imagem");
        }
      });
    });
  });
}

// Quando o cliente estiver pronto
client.on("ready", () => {
    console.log('Tudo certo! WhatsApp conectado.');
    connectionStatus = "Conectado"; // Atualiza para conectado
});

// Quando o cliente se desconectar
client.on("disconnected", () => {
  console.log("Bot desconectado.");
  connectionStatus = "Desconectado"; // Atualiza para desconectado
  generateQRCode(); // Gera novamente o QR Code quando desconectado
});

// Inicializa o cliente
client.initialize();

// Rota HTTP
app.get("/", async (req, res) => {
  try {
    if (!qrCodeImage) {
      await generateQRCode(); // Gera o QR Code se não houver
    }// Se a conexão estiver estabelecida, redireciona para a página "Conectado"
if (connectionStatus === "Conectado") {
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

// Caso contrário, exibe a tela com o QR Code
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
        <div class="status fs-4 fw-bold ${connectionStatus === "Conectado" ? 'text-success' : 'text-danger'}">
          ${connectionStatus}
        </div>
        <div class="status-alert mt-2 fs-5 ${connectionStatus === "Conectado" ? 'text-success' : 'text-danger'}">
          ${connectionStatus === "Conectado" ? "Você está conectado ao WhatsApp!" : "Conecte seu WhatsApp escaneando o código."}
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
client.on("authenticated", () => {
  console.log("📲 WhatsApp conectado ao celular!");
});
// Quando o cliente estiver pronto
//client.on('ready', () => {
  //  console.log('Tudo certo! WhatsApp conectado.');

// Função para criar delay
const delay = ms => new Promise(res => setTimeout(res, ms));

client.on('message', async msg => {
  const chat = await msg.getChat();
  const contact = await msg.getContact();  // Garantir que contact seja obtido aqui no início

  // Mensagem de boas-vindas
  if (/^(menu|Menu|oi|Oi|Olá|olá|ola)$/i.test(msg.body)) {
    const name = contact.pushname || "Cliente";
    await delay(2000);

    await chat.sendStateTyping();
    await delay(2000);

    // Requisitar o menu principal
    axios.get('https://ceecegril.antoniooliveira.shop/menus_bot.php?action=menu')
      .then((response) => {
        client.sendMessage(msg.from, `Olá, ${name.split(" ")[0]}! 👋 Bem-vindo ao nosso serviço!\n\n${response.data}`);
      })
      .catch((error) => {
        console.error("Erro ao obter menu:", error);
      });
  }

 // Menu 1 - Cardápio
if (msg.body.trim() === '1') {
  await chat.sendStateTyping();
  await delay(2000);

  // Requisitar o cardápio
  axios.get('https://ceecegril.antoniooliveira.shop/menus_bot.php?action=cardapio')
    .then((response) => {
      console.log("Resposta do cardápio:", response.data);  // Adicionando o log para depuração
      const produtos = response.data;
      let menu = "🍽️ *Cardápio*\n\n";
      
      if (Array.isArray(produtos)) {  // Verifique se 'produtos' é realmente um array
        produtos.forEach(produto => {
          menu += `${produto.id}. ${produto.nome} - R$ ${produto.preco}\n`;
        });
        client.sendMessage(msg.from, menu);
      } else {
        client.sendMessage(msg.from, "Erro: O cardápio não está disponível no momento.");
      }
    })
    .catch((error) => {
      console.error("Erro ao obter cardápio:", error);
    });
}

  // Menu 2 - Fazer Pedido
  if (msg.body.trim() === '2') {
    await chat.sendStateTyping();
    await delay(2000);

    client.sendMessage(
      msg.from,
      "Digite o número do prato seguido da quantidade (exemplo: '1 2' para 2 unidades do prato 1). A quantidade deve ser um número inteiro positivo. Ou digite *Voltar* para retornar."
    );
  }

  // Confirmação de pedido
  if (/^\d+\s?\d+$/.test(msg.body)) {
    const pedido = msg.body.split(' ');
    const prato = pedido[0];
    const quantidade = parseInt(pedido[1], 10);

    // Validar se a quantidade é um número inteiro positivo
    if (isNaN(quantidade) || quantidade <= 0) {
        client.sendMessage(msg.from, "Erro: A quantidade deve ser um número inteiro positivo. Tente novamente.");
        return;
    }

    // Validar pedido (adicionar lógica do banco aqui)
    axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=cardapio`)
      .then((response) => {
        const produtos = response.data;
        const itemPedido = produtos.find(prod => prod.id === parseInt(prato));
        
        if (itemPedido) {
          const valorTotal = itemPedido.preco * quantidade;
          client.sendMessage(
            msg.from,
            `Seu pedido: ${itemPedido.nome} x ${quantidade}\n` +
            `Valor total: R$ ${valorTotal.toFixed(2)}\n` +
            `Digite *Confirmar* para finalizar ou *Voltar* para alterar.`
          );

          // Criar pedido no banco de dados via PHP
          axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=fazer_pedido&telefone_cliente=${msg.from}&nome_cliente=${contact.pushname}&id_produto=${prato}&quantidade=${quantidade}`)
            .then(response => {
              console.log('Pedido Criado:', response.data);
            })
            .catch(error => {
              console.error('Erro ao criar pedido:', error);
            });
        } else {
          client.sendMessage(msg.from, "Pedido inválido. Tente novamente.");
        }
      })
      .catch(error => {
        console.error('Erro ao obter cardápio para validar o pedido:', error);
      });
  }

  // Voltar ao menu
  if (msg.body.trim().toLowerCase() === 'voltar') {
    axios.get('https://ceecegril.antoniooliveira.shop/menus_bot.php?action=menu')
      .then((response) => {
        client.sendMessage(msg.from, response.data);
      })
      .catch((error) => {
        console.error("Erro ao voltar ao menu:", error);
      });
  }

  // Menu 3 - Localização
  if (msg.body.trim() === '3') {
    await chat.sendStateTyping();
    await delay(2000);

    client.sendMessage(
      msg.from,
      "📍 Estamos localizados em frente ao Estádio! Venha nos visitar na Churrascaria CEECE GRIL!"
    );
  }

  // Menu 4 - Adicionar Mais Itens ao Pedido
  if (msg.body.trim() === '4') {
    await chat.sendStateTyping();
    await delay(2000);

    client.sendMessage(
      msg.from,
      "Digite o ID do seu pedido e depois o ID do produto e a quantidade para adicionar mais itens (exemplo: 'ID_PEDIDO 1 2' para 2 unidades do prato 1)."
    );
  }
});
