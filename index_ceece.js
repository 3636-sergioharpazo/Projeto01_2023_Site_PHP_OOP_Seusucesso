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


client.on('message', async (msg) => {
  const chat = await msg.getChat();
  const contact = await msg.getContact();
  const nomeCliente = contact.pushname || "Cliente";

  // Mensagem de boas-vindas e menu principal
  if (/^(menu|oi|ol[áa])$/i.test(msg.body)) {
    await delay(2000);
    await chat.sendStateTyping();
    await delay(2000);

    axios.get('https://ceecegril.antoniooliveira.shop/menus_bot.php?action=menu')
      .then((response) => {
        client.sendMessage(msg.from, `Olá, ${nomeCliente.split(" ")[0]}! 👋\n\n${response.data}`);
      })
      .catch((error) => {
        console.error("Erro ao obter menu:", error);
      });
  }

  // Menu 1 - Cardápio
  else if (msg.body.trim() === '1') {
    await chat.sendStateTyping();
    await delay(2000);

    axios.get('https://ceecegril.antoniooliveira.shop/menus_bot.php?action=cardapio')
      .then(response => {
        client.sendMessage(msg.from, response.data);
      })
      .catch(error => {
        console.error("Erro ao obter cardápio:", error);
        client.sendMessage(msg.from, "Desculpe, não conseguimos obter o cardápio no momento.");
      });
  }

  // Menu 2 - Fazer Pedido
  else if (msg.body.trim() === '2') {
    await chat.sendStateTyping();
    await delay(2000);

    client.sendMessage(
      msg.from,
      "Digite o número do prato seguido da quantidade (exemplo: '1 2' para 2 unidades do prato 1)."
    );
  }

  // Confirmação de pedido
  else if (/^\d+\s?\d+$/.test(msg.body)) {
    const pedido = msg.body.split(' ');
    const prato = pedido[0];
    const quantidade = parseInt(pedido[1], 10);

    if (isNaN(quantidade) || quantidade <= 0) {
      client.sendMessage(msg.from, "Erro: A quantidade deve ser um número inteiro positivo.");
      return;
    }

    axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=verificar_cardapio2&id_produto=${prato}`)
      .then(response => {
        if (response.data && response.data.produto) {
          const itemPedido = response.data.produto;
          const valorTotal = itemPedido.preco * quantidade;

          client.sendMessage(
            msg.from,
            `Seu pedido: ${itemPedido.nome} x ${quantidade}\nValor total: R$ ${valorTotal.toFixed(2)}\n` +
            `Digite *Confirmar* para finalizar ou *Voltar* para alterar.`
          );

          axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=fazer_pedido2&telefone_cliente=${msg.from}&nome_cliente=${encodeURIComponent(nomeCliente)}&id_produto=${prato}&quantidade=${quantidade}`)
            .then(response => {
              if (response.data.pedido_id) {
                client.sendMessage(msg.from, `Pedido registrado com sucesso! ✅\nSeu número de pedido é: *${response.data.pedido_id}*`);
              } else {
                client.sendMessage(msg.from, "Erro ao registrar o pedido. Tente novamente.");
              }
            })
            .catch(error => {
              console.error('Erro ao criar pedido:', error);
              client.sendMessage(msg.from, "Erro ao registrar o pedido. Tente novamente.");
            });
        }
      });
  }

  // Menu 3 - Localização
  else if (msg.body.trim() === '3') {
    await chat.sendStateTyping();
    await delay(2000);

    client.sendMessage(msg.from, "📍 Estamos localizados em frente ao Estádio! Churrascaria CEECE GRIL! 🍖");
  }

  // Menu 4 - Adicionar Mais Itens ao Pedido
  else if (msg.body.trim() === '4') {
    await chat.sendStateTyping();
    await delay(2000);

    client.sendMessage(msg.from, "Digite o ID do seu pedido e depois o ID do produto e a quantidade para adicionar (ex: '123 1 2').");
  }

  // Adicionar item ao pedido
  else if (/^\d+\s\d+\s\d+$/.test(msg.body)) {
    const [idPedido, idProduto, quantidade] = msg.body.split(' ');
    const qtd = parseInt(quantidade, 10);

    if (isNaN(qtd) || qtd <= 0) {
      client.sendMessage(msg.from, "Erro: A quantidade deve ser um número inteiro positivo.");
      return;
    }

    axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=adicionar_item&id_pedido=${idPedido}&id_produto=${idProduto}&quantidade=${qtd}`)
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
          client.sendMessage(msg.from, `📦 Pedido #${response.data.id}\nStatus: ${response.data.status}\nNome: ${response.data.nome_cliente}`);
        } else {
          client.sendMessage(msg.from, "Pedido não encontrado.");
        }
      })
      .catch(error => {
        console.error("Erro ao buscar pedido:", error);
        client.sendMessage(msg.from, "Erro ao buscar pedido. Tente novamente.");
      });
  }
});

// Função para verificar pedidos e atualizar os clientes
const verificarPedidos = async () => {
  try {
    const response = await axios.get('https://ceecegril.antoniooliveira.shop/obter_pedidos.php');
    const pedidos = response.data.pedidos;
    
    for (const { id, telefone_cliente, nome_cliente, status, criado_em } of pedidos) {
      const numeroWhatsApp = `${telefone_cliente.replace('@c.us', '')}@c.us`;
      
      if (status === "aberto") {
        // Verifica quantos pedidos foram concluídos antes do atual
        const filaResponse = await axios.get(`https://ceecegril.antoniooliveira.shop/contar_pedidos.php?criado_em=${criado_em}`);
        const { posicao } = filaResponse.data;
        
        await client.sendMessage(numeroWhatsApp, `⏳ Olá, ${nome_cliente}! Seu pedido está na posição ${posicao} da fila de espera. Manteremos você atualizado!`);
      } else if (status === "saiu") {
        await client.sendMessage(numeroWhatsApp, `🚚 Olá, ${nome_cliente}! Seu pedido (ID: ${id}) saiu para entrega. Fique atento!`);
      }

      // Verificar se a data de nascimento está preenchida
      const clienteResponse = await axios.get(`https://ceecegril.antoniooliveira.shop/obter_cliente.php?telefone=${telefone_cliente}`);
      const { data_nascimento } = clienteResponse.data;
      
      if (!data_nascimento) {
        await client.sendMessage(numeroWhatsApp, `📅 Olá, ${nome_cliente}! Percebemos que sua data de nascimento não está cadastrada. Poderia informá-la? Responda com sua data no formato DD/MM/AAAA.`);
        
        client.on('message', async msg => {
          if (msg.from === numeroWhatsApp && /^\d{2}\/\d{2}\/\d{4}$/.test(msg.body)) {
            await axios.post('https://ceecegril.antoniooliveira.shop/atualizar_cliente.php', {
              telefone: telefone_cliente,
              data_nascimento: msg.body
            });
            await client.sendMessage(numeroWhatsApp, `✅ Obrigado, ${nome_cliente}! Sua data de nascimento foi atualizada com sucesso.`);
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ Erro ao buscar pedidos:', error.message || error);
  }
};

// Verificar pedidos a cada 2 minutos
setInterval(verificarPedidos, 2 * 60 * 1000);
verificarPedidos();
// Função para enviar mensagens de aniversário
const enviarMensagensAniversario = async () => {
  try {
    const response = await axios.get('https://ceecegril.antoniooliveira.shop/obter_clientes.php');
    const clientes = response.data.clientes;
    
    // Obtém a data atual no formato DD/MM
    const hoje = new Date();
    const dataAtual = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    // Array de mensagens de aniversário
    const mensagens = [
      `🎉 Olá, {nome}! Que alegria comemorar o seu dia! A equipe da *CEECE Gril* te deseja muitas felicidades e um dia repleto de sabor! 🎂🥳🍗🔥`,
      `🎂 Parabéns, {nome}! Hoje é o seu dia e a equipe da *CEECE Gril* deseja que seja repleto de alegria e boa comida! 🥳🎉 Aproveite o seu aniversário com o melhor churrasco! 🍗🔥`,
      `🥳 Feliz aniversário, {nome}! A *CEECE Gril* deseja a você um dia incrível, cheio de momentos especiais e claro, muito sabor! 🎉🎂🍖 Que seu dia seja repleto de boas energias! 🔥`,
      `🎉 Uhul, {nome}! O seu aniversário chegou e a *Ceece Gril* está aqui para te desejar um dia super especial! Que ele seja recheado de alegria e deliciosos pratos! 🍗🎂🥳🔥`,
      `🎂 Parabéns, {nome}! A equipe da *CEECE Gril* te deseja um aniversário repleto de felicidade e momentos incríveis! Que tal comemorar com um delicioso churrasco? 🥳🍗🔥🎉`
    ];

    for (const { nome, telefone, data_nascimento } of clientes) {
      if (data_nascimento) {
        // Extrai o dia e mês da data de nascimento
        const [dia, mes, _] = data_nascimento.split('/');
        const dataCliente = `${dia}/${mes}`;

        if (dataCliente === dataAtual) {
          const numeroWhatsApp = `${telefone.replace('@c.us', '')}@c.us`;

          // Seleciona uma mensagem aleatória e substitui o nome do cliente
          const mensagemAleatoria = mensagens[Math.floor(Math.random() * mensagens.length)].replace("{nome}", nome);

          await client.sendMessage(numeroWhatsApp, mensagemAleatoria);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao enviar mensagens de aniversário:', error.message || error);
  }
};

// Executa a função todos os dias às 8h da manhã
setInterval(() => {
  const agora = new Date();
  if (agora.getHours() === 8 && agora.getMinutes() === 0) {
    enviarMensagensAniversario();
  }
}, 60 * 1000); // Verifica a cada minuto
