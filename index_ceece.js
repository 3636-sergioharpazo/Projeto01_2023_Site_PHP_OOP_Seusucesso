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
    '6': "📍 Esse canal é excluisivo para pedidos, mas em instantes iremos te atender! 🍖"
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

 

 

 // Menu 4 - Adicionar Mais Itens ao Pedido
if (msg.body.trim() === '4') {
  await chat.sendStateTyping();
  await delay(2000);
  axios.get('https://ceecegril.antoniooliveira.shop/menus_bot.php?action=cardapio')
    .then(response => client.sendMessage(msg.from, response.data))
    .catch(error => {
      console.error("Erro ao obter cardápio:", error);
      client.sendMessage(msg.from, "Desculpe, não conseguimos obter o cardápio no momento.");
    });

  client.sendMessage(msg.from, "Digite o ID do seu pedido, o ID do produto e a quantidade para adicionar (ex: '123 1 2').\nOu digite 'voltar' ou 'menu' para retornar ao menu principal.");

  // Função para tratar a resposta do usuário
  const handleUserMessage = async (newMsg) => {
    const mensagem = newMsg.body.trim().toLowerCase();

    // Verifica se o usuário quer voltar ao menu principal
    if (mensagem === 'voltar' || mensagem === 'menu') {
      client.sendMessage(msg.from, "🔙 Retornando ao menu principal...");
      // Aqui você pode chamar a função que reinicia o menu principal, se necessário
      return; // Retorna ao menu principal
    }

    // Verificar se a entrada está no formato correto
    if (/^\d+\s\d+\s\d+$/.test(mensagem)) {
      const [idPedido, idProduto, quantidade] = mensagem.split(' ');
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
    } else {
      // Exibir a mensagem apenas se a entrada não for válida
      client.sendMessage(msg.from, "⚠️ Formato inválido. Por favor, digite no formato correto (ex: '123 1 2').");
    }
  };

  // Registra o handler de mensagem
  client.on('message', handleUserMessage);
}
// Menu 5 - Ver Pedido
if (msg.body.trim() === '5') {
  await chat.sendStateTyping();
  await delay(2000);
  client.sendMessage(msg.from, "Digite o ID do pedido para visualizar os detalhes.\nOu digite *voltar* ou *menu* para retornar ao menu principal.");

  // Variável de controle para evitar múltiplos ouvintes de eventos
  let isListening = true;

  // Aguarda o ID do pedido ou comando para voltar ao menu principal
  client.on('message', async (newMsg) => {
    if (!isListening) return; // Impede que o código continue se já estiver processando

    isListening = false; // Impede novos ouvintes enquanto o processo está em andamento

    const mensagem = newMsg.body.trim().toLowerCase();

    // Verifica se o cliente deseja voltar ou ir ao menu principal
    if (mensagem === 'voltar' || mensagem === 'menu') {
      client.sendMessage(msg.from, "🔙 Retornando ao menu principal...");
      // Aqui você pode chamar a função que reinicia o menu principal, se necessário
      isListening = true; // Permite novos ouvintes para o próximo fluxo
      return;  // Retorna ao fluxo do menu principal
    }

    // Verifica se o ID do pedido é um número
    if (/^\d+$/.test(mensagem)) {
      axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=ver_pedido&id_pedido=${mensagem}`)
        .then(response => {
          if (response.data && response.data.id) {
            let mensagemResposta = `📦 *Pedido #${response.data.id}*\n🔹 *Status:* ${response.data.status}\n👤 *Nome:* ${response.data.nome_cliente}\n\n🛒 *Itens do Pedido:*\n`;

            if (response.data.itens && response.data.itens.length > 0) {
              response.data.itens.forEach(item => {
                mensagemResposta += `🔹 *Produto:* ${item.nome_produto} (ID: ${item.id_produto})\n   ➡️ Quantidade: ${item.quantidade}\n   💰 Subtotal: R$ ${item.subtotal}\n\n`;
              });
            } else {
              mensagemResposta += "⚠️ Nenhum item encontrado neste pedido.\n";
            }

            mensagemResposta += `💳 *Total do Pedido:* R$ ${response.data.total}`;

            client.sendMessage(msg.from, mensagemResposta);
          } else {
            client.sendMessage(msg.from, "⚠️ Pedido não encontrado.");
          }
        })
        .catch(error => {
          console.error("Erro ao buscar pedido:", error);
          client.sendMessage(msg.from, "⚠️ Erro ao buscar pedido. Tente novamente.");
        });
    } else {
      // Caso o ID não seja válido, a mensagem de erro é enviada
      client.sendMessage(msg.from, "⚠️ Por favor, digite um ID de pedido válido.");
    }

    isListening = true; // Permite novos ouvintes para o próximo fluxo
  });
}

 // Menu 6 - Atendimento
 
  // Menu 2 - Fazer Pedido
if (msg.body.trim() === '2') {
  await chat.sendStateTyping();
  await delay(2000);
  client.sendMessage(msg.from, "Digite o número do prato seguido da quantidade (exemplo: '1 2' para 2 unidades do prato 1).");

  // Confirmação de Pedido
  client.on('message', async (newMsg) => {
    const mensagem = newMsg.body.trim();

    if (/^\d+\s?\d+$/.test(mensagem)) {
      const [prato, qtd] = mensagem.split(' ');
      const quantidade = parseInt(qtd, 10);

      if (isNaN(quantidade) || quantidade <= 0) {
        return client.sendMessage(newMsg.from, "Erro: A quantidade deve ser um número inteiro positivo.");
      }

      axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=verificar_cardapio2&id_produto=${prato}`)
        .then(response => {
          if (response.data?.produto) {
            const { nome, preco } = response.data.produto;
            const valorTotal = preco * quantidade;
            client.sendMessage(
              newMsg.from,
              `Seu pedido: ${nome} x ${quantidade}\nValor total: R$ ${valorTotal.toFixed(2)}\n` +
              `Digite *Confirmar* para finalizar ou *Voltar* para alterar.`
            );
            pedidosPendentes[newMsg.from] = { prato, quantidade, nomeCliente: newMsg.from }; // armazena o pedido pendente
          }
        })
        .catch(error => {
          console.error("Erro ao verificar cardápio:", error);
          client.sendMessage(newMsg.from, "Erro ao verificar o cardápio. Tente novamente.");
        });
    }

    // Confirmar Pedido
    if (mensagem.trim().toLowerCase() === 'confirmar' && pedidosPendentes[newMsg.from]) {
      const { prato, quantidade } = pedidosPendentes[newMsg.from];
      const contact = await msg.getContact();
      let nomeCliente = contact.pushname || "Cliente";  // Usando 'let' para permitir a reatribuição
      let cliente_telefone = newMsg.from.split('@')[0];
      
    

      axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=fazer_pedido2&telefone_cliente=${cliente_telefone}&nome_cliente=${encodeURIComponent(nomeCliente)}&id_produto=${prato}&quantidade=${quantidade}`)
        .then(response => {
          if (response.data.pedido_id) {
            client.sendMessage(newMsg.from, `Pedido registrado com sucesso! ✅\nSeu número de pedido é: *${response.data.pedido_id}*`);
            delete pedidosPendentes[newMsg.from]; // limpa o pedido pendente
          } else {
            client.sendMessage(newMsg.from, "Erro ao registrar o pedido. Tente novamente.");
          }
        })
        .catch(error => {
          console.error('Erro ao criar pedido:', error);
          client.sendMessage(newMsg.from, "Erro ao registrar o pedido. Tente novamente.");
        });
    }

    // Cancelar Pedido
    if (mensagem.trim().toLowerCase() === 'voltar' && pedidosPendentes[newMsg.from]) {
      client.sendMessage(newMsg.from, "Pedido cancelado. Digite novamente o número do prato e a quantidade.");
      delete pedidosPendentes[newMsg.from]; // cancela o pedido pendente
    }
  });
}


  // Cancelar Pedido
  if (msg.body.trim().toLowerCase() === 'voltar' && pedidosPendentes[msg.from]) {
    client.sendMessage(msg.from, "Pedido cancelado. Digite novamente o número do prato e a quantidade.");
    delete pedidosPendentes[msg.from];
  }
// client on ready ----------------------final

setInterval(async () => {
  if (!client) {
    console.error('❌ Erro: client não está inicializado.');
    return;
  }

  console.log('⏳ Executando verificações...');
  try {
    await verificarPedidos(client);
    await enviarMensagensAniversario(client);
  } catch (error) {
    console.error('❌ Erro ao executar verificações:', error.message);
  }
}, 60 * 1000);
});
// Mapa para rastrear quantas vezes cada cliente foi avisado
const avisosEnviados = new Map();

// Função para verificar pedidos e atualizar os clientes
const verificarPedidos = async (client) => {
  if (!client) {
    console.error('❌ Erro: client não está definido.');
    return;
  }

  console.log('📦 Iniciando verificação de pedidos...');
  try {
    const response = await axios.get('https://ceecegril.antoniooliveira.shop/obter_pedidos.php');
    if (!response.data || !response.data.pedidos) {
      console.error('⚠️ Nenhum pedido encontrado.');
      return;
    }

    const pedidos = response.data.pedidos;
    console.log('Pedidos obtidos:', pedidos);

    for (const { id, telefone_cliente, nome_cliente, status, criado_em } of pedidos) {
      const numeroWhatsApp = `${telefone_cliente}@s.whatsapp.net`; // Formato correto
      console.log(`📦 Verificando pedido ${id} para ${nome_cliente} (${numeroWhatsApp}) com status ${status}`);

      try {
        if (status === "aberto") {
          // Obtém a posição na fila
          const filaResponse = await axios.get(`https://ceecegril.antoniooliveira.shop/contar_pedidos.php?criado_em=${criado_em}`);
          const { posicao } = filaResponse.data;

          if (posicao !== undefined) {
            console.log(`📌 Posição na fila: ${posicao}`);

            // Obtém quantos avisos já foram enviados para esse cliente
            const avisos = avisosEnviados.get(numeroWhatsApp) || 0;

            if (avisos < 2) { // Limite de 2 avisos
              await client.sendMessage(numeroWhatsApp, `⏳ Olá, ${nome_cliente}! Seu pedido (ID: ${id}) está atualmente na posição ${posicao} da nossa fila. Agradecemos pela paciência!`);
              avisosEnviados.set(numeroWhatsApp, avisos + 1);
            } else {
              console.log(`🔕 Cliente ${nome_cliente} já recebeu ${avisos} avisos. Não será enviado mais.`);
            }
          } else {
            console.warn(`⚠️ Posição na fila não encontrada para pedido ${id}.`);
          }
        } else if (status === "saiu") {
          console.log(`🚚 O pedido ${id} saiu para entrega.`);
          await client.sendMessage(numeroWhatsApp, `🚀 Olá, ${nome_cliente}! Temos uma ótima notícia para você! 🎉

Seu pedido (ID: ${id}) já saiu para entrega e em breve estará com você. Fique atento ao telefone e aguarde com expectativa. 🍽️😋

Se precisar de algo, estamos à disposição! Obrigado por escolher a Ceece Gril. 🥩🔥`);
        }
      } catch (error) {
        console.error(`❌ Erro ao enviar mensagem para ${numeroWhatsApp}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao buscar pedidos:', error.message);
  }
};
const enviarMensagensAniversario = async (client) => {
  console.log('🎉 Verificando aniversariantes...');

  if (!client || typeof client.sendMessage !== 'function') {
    console.error('❌ Erro: client não está definido corretamente ou sendMessage não está disponível.');
    return;
  }

  try {
    const response = await axios.get('https://ceecegril.antoniooliveira.shop/obter_clientes.php');
    
    console.log("📢 Resposta da API de aniversariantes:", response.data);

    if (!response.data || !Array.isArray(response.data.aniversariantes) || response.data.aniversariantes.length === 0) {
      console.error('⚠️ Nenhum aniversariante encontrado.');
      return;
    }

    const aniversariantes = response.data.aniversariantes;
    console.log(`🎂 Aniversariantes obtidos: ${JSON.stringify(aniversariantes)}`);

    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mesHoje = hoje.getMonth() + 1; // Janeiro é 0

    for (const { nome, telefone, aniversario } of aniversariantes) {
      console.log(`📅 Verificando aniversário de ${nome} com data ${aniversario}`);
      
      if (!aniversario) {
        console.warn(`⚠️ Data de aniversário inválida para ${nome}`);
        continue;
      }

      const [ano, mes, dia] = aniversario.split('-').map(Number);

      if (dia === diaHoje && mes === mesHoje) {
        const numeroWhatsApp = `${telefone.replace(/\s+/g, '')}@s.whatsapp.net`; // Remove espaços no número
        console.log(`🎊 Aniversariante encontrado: ${nome}, enviando mensagem para ${numeroWhatsApp}`);

        try {
          await client.sendMessage(numeroWhatsApp, `🎉 Parabéns, ${nome}! Hoje é o seu dia especial! 🥳 Toda a equipe da CEECE GRIL deseja um dia cheio de alegrias e muitos momentos incríveis! 🎂🎁`);
          console.log(`✅ Mensagem de aniversário enviada para ${nome}`);
        } catch (error) {
          console.error(`❌ Erro ao enviar mensagem de aniversário para ${nome}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao buscar aniversariantes:', error.message);
  }
};
// Intervalo para executar verificações a cada minuto
// Supondo que a inicialização do client seja algo assim
//const client = new SomeClientClass(); // Substitua por como o client deve ser inicializado

