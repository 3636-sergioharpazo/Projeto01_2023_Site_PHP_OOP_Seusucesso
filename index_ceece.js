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
// Manipulação de Mensagens
const pedidosPendentes = {};

client.on('message', async (msg) => {
  const chat = await msg.getChat();
  const contact = await msg.getContact();
  const nomeCliente = contact.pushname || "Cliente";

  // Mensagem de boas-vindas e menu principal
  if (/^(menu|oi|ol[áa])$/i.test(msg.body)) {
    await chat.sendStateTyping();
    await delay(2000);

    axios.get('https://ceecegril.antoniooliveira.shop/menus_bot.php?action=menu')
      .then(response => {
        client.sendMessage(msg.from, `Olá, ${nomeCliente.split(" ")[0]}! 👋\n\n${response.data}`);
      })
      .catch(error => console.error("Erro ao obter menu:", error));
  }

  // Definição das opções do menu
  const menuOpcoes = {
    '1': 'cardapio',
    '3': "📍 Estamos localizados em frente ao Estádio! Churrascaria CEECE GRIL! 🍖",
    '5': "Digite o ID do pedido para visualizar os detalhes."
  };

  if (menuOpcoes[msg.body.trim()]) {
    await chat.sendStateTyping();
    await delay(2000);
    if (msg.body.trim() === '1') {
      axios.get('https://ceecegril.antoniooliveira.shop/menus_bot.php?action=cardapio')
        .then(response => client.sendMessage(msg.from, response.data))
        .catch(error => {
          console.error("Erro ao obter cardápio:", error);
          client.sendMessage(msg.from, "Desculpe, não conseguimos obter o cardápio no momento.");
        });
    } else {
      client.sendMessage(msg.from, menuOpcoes[msg.body.trim()]);
    }
  }

    // Menu 6 - Atendimento
else if (msg.body.trim() === '6') {
  await chat.sendStateTyping();
  await delay(2000);

  // Enviar mensagem para uma atendente
  const atendenteNumber = '5588988019118'; // Substitua com o número do atendente
  const message = "👋 Olá! Você recebeu uma nova mensagem de um cliente pelo o canal da Churrascaria CEECE GRIL. Por favor, responda assim que possível.";

  client.sendMessage(atendenteNumber, message);
  client.sendMessage(msg.from, "💬 Sua solicitação foi encaminhada para um de nossos atendentes. Aguarde um momento!");
}
   // Menu 4 - Adicionar Mais Itens ao Pedido
   else if (msg.body.trim() === '4') {
    await chat.sendStateTyping();
    await delay(2000);
    axios.get('https://ceecegril.antoniooliveira.shop/menus_bot.php?action=cardapio')
    .then(response => client.sendMessage(msg.from, response.data))
    .catch(error => {
      console.error("Erro ao obter cardápio:", error);
      client.sendMessage(msg.from, "Desculpe, não conseguimos obter o cardápio no momento.");
    });

  
    client.sendMessage(msg.from, "Digite o ID do seu pedido, o ID do produto e a quantidade para adicionar (ex: '123 1 2').");
    client.sendMessage(msg.from, menuOpcoes[msg.body.trim()]);
  }

  // Adicionar item ao pedido
  else if (/^\d+\s\d+\s\d+$/.test(msg.body)) {
    const [idPedido, idProduto, quantidade] = msg.body.split(' ');
    const qtd = parseInt(quantidade, 10);
    const telefoneCliente = msg.from;

    if (isNaN(qtd) || qtd <= 0) {
      client.sendMessage(msg.from, "Erro: A quantidade deve ser um número inteiro positivo.");
      return;
    }

   
          axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=adicionar_item&id_pedido=${idPedido}&id_produto=${idProduto}&quantidade=${qtd}&telefone=${telefoneCliente}`)
            .then(() => {
              client.sendMessage(msg.from, "Item adicionado ao pedido com sucesso! ✅");
            })
            .catch(error => {
              console.error('Erro ao adicionar item:', error);
              client.sendMessage(msg.from, "Erro ao adicionar item ao pedido. Tente novamente.");
            });
     
  }

// Menu 5 - Ver Pedido
else if (msg.body.trim() === '5') {
    await chat.sendStateTyping();
    await delay(2000);
    client.sendMessage(msg.from, "Digite o ID do pedido para visualizar os detalhes.");
}

// Ver detalhes do pedido
else if (/^\d+$/.test(msg.body)) {
  axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=ver_pedido&id_pedido=${msg.body}`)
    .then(response => {
      if (response.data && response.data.id) {
        let mensagem = `📦 *Pedido #${response.data.id}*\n🔹 *Status:* ${response.data.status}\n👤 *Nome:* ${response.data.nome_cliente}\n\n🛒 *Itens do Pedido:*\n`;

        if (response.data.itens && response.data.itens.length > 0) {
          response.data.itens.forEach(item => {
            mensagem += `🔹 *Produto:* ${item.nome_produto} (ID: ${item.id_produto})\n   ➡️ Quantidade: ${item.quantidade}\n   💰 Subtotal: R$ ${item.subtotal}\n\n`;
          });
        } else {
          mensagem += "⚠️ Nenhum item encontrado neste pedido.\n";
        }

        mensagem += `💳 *Total do Pedido:* R$ ${response.data.total}`;

        client.sendMessage(msg.from, mensagem);
      } else {
        client.sendMessage(msg.from, "⚠️ Pedido não encontrado.");
      }
    })
    .catch(error => {
      console.error("Erro ao buscar pedido:", error);
      client.sendMessage(msg.from, "⚠️ Erro ao buscar pedido. Tente novamente.");
    });
}




  
  // Fazer Pedido
  else if (msg.body.trim() === '2') {
    await chat.sendStateTyping();
    await delay(2000);
    client.sendMessage(msg.from, "Digite o número do prato seguido da quantidade (exemplo: '1 2' para 2 unidades do prato 1). ");
  }

  // Confirmação de Pedido
  else if (/^\d+\s?\d+$/.test(msg.body)) {
    const [prato, qtd] = msg.body.split(' ');
    const quantidade = parseInt(qtd, 10);

    if (isNaN(quantidade) || quantidade <= 0) {
      return client.sendMessage(msg.from, "Erro: A quantidade deve ser um número inteiro positivo.");
    }

    axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=verificar_cardapio2&id_produto=${prato}`)
      .then(response => {
        if (response.data?.produto) {
          const { nome, preco } = response.data.produto;
          const valorTotal = preco * quantidade;
          client.sendMessage(
            msg.from,
            `Seu pedido: ${nome} x ${quantidade}\nValor total: R$ ${valorTotal.toFixed(2)}\n` +
            `Digite *Confirmar* para finalizar ou *Voltar* para alterar.`
          );
          pedidosPendentes[msg.from] = { prato, quantidade, nomeCliente };
        }
      });
  }

  // Finalizar Pedido
  else if (msg.body.trim().toLowerCase() === 'confirmar' && pedidosPendentes[msg.from]) {
    const { prato, quantidade, nomeCliente } = pedidosPendentes[msg.from];

    axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=fazer_pedido2&telefone_cliente=${msg.from}&nome_cliente=${encodeURIComponent(nomeCliente)}&id_produto=${prato}&quantidade=${quantidade}`)
      .then(response => {
        if (response.data.pedido_id) {
          client.sendMessage(msg.from, `Pedido registrado com sucesso! ✅\nSeu número de pedido é: *${response.data.pedido_id}*`);
          delete pedidosPendentes[msg.from];
        } else {
          client.sendMessage(msg.from, "Erro ao registrar o pedido. Tente novamente.");
        }
      })
      .catch(error => {
        console.error('Erro ao criar pedido:', error);
        client.sendMessage(msg.from, "Erro ao registrar o pedido. Tente novamente.");
      });
  }

  // Cancelar Pedido
  else if (msg.body.trim().toLowerCase() === 'voltar' && pedidosPendentes[msg.from]) {
    client.sendMessage(msg.from, "Pedido cancelado. Digite novamente o número do prato e a quantidade.");
    delete pedidosPendentes[msg.from];
  }


});

// Função para verificar pedidos pendentes
const verificarPedidos = async () => {
  try {
    const response = await axios.get('https://ceecegril.antoniooliveira.shop/obter_pedidos.php');
    const pedidos = response.data.pedidos;

    for (const { id, telefone_cliente, nome_cliente, status } of pedidos) {
      if (status === "saiu") {
        const numeroWhatsApp = `${telefone_cliente.replace('@c.us', '')}@c.us`;
        await client.sendMessage(numeroWhatsApp, `📦 Olá, ${nome_cliente}! Seu pedido (ID: ${id}) saiu para entrega. Fique atento! 🚚💨`);
        console.log(`📩 Mensagem enviada para ${nome_cliente} informando que o pedido saiu.`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao buscar pedidos:', error.message || error);
  }
};

// Verificar pedidos a cada 2 minutos
setInterval(verificarPedidos, 2 * 60 * 1000);
verificarPedidos();
