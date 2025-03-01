const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const axios = require('axios');

const fs = require('fs');
const rimraf = require('rimraf');
const express = require('express');
const { exec } = require('child_process');

const app = express();
const PORT = 3002;
const qrCodeDir = '/var/www/html';
const sessionDir = path.join(qrCodeDir, '.wwebjs_auth/session-default');

let isQRCodeGenerated = false;
let qrCodeGeneratedAt = null;
let reconnectAttempts = 0;
let isClientReady = false;

require('events').EventEmitter.defaultMaxListeners = 100;

// Função para verificar a conexão com a internet
function checkInternetConnection(callback) {
  exec('ping -c 1 google.com', (error) => {
    callback(!error);
  });
}

// Função para gerar QR Code e salvar no diretório
async function generateQRCode(qr) {
  const qrCodePath = path.join(qrCodeDir, 'qrcode.png');

  try {
    if (fs.existsSync(qrCodePath)) fs.unlinkSync(qrCodePath);
    await qrcode.toFile(qrCodePath, qr, { width: 400, margin: 1 });
    console.log(`✅ QR Code salvo em: ${qrCodePath}`);

    isQRCodeGenerated = true;
    qrCodeGeneratedAt = Date.now();
  } catch (error) {
    console.error('❌ Erro ao gerar QR Code:', error);
  }
}

// Função para reiniciar o cliente e remover sessão
function restartClient() {
  console.log('🔄 Reiniciando o cliente...');

  reconnectAttempts = 0;
  isQRCodeGenerated = false;
  qrCodeGeneratedAt = null;
  isClientReady = false;

  client.destroy().then(() => {
    if (fs.existsSync(sessionDir)) rimraf.sync(sessionDir);
    initializeClient();
  }).catch(err => console.error('Erro ao destruir cliente:', err));
}

// Função para tentar reconectar
function attemptReconnect() {
  if (reconnectAttempts < 10) {
    console.log(`🔄 Tentativa de reconexão ${reconnectAttempts + 1}/10...`);
    reconnectAttempts++;
    client.initialize();
  } else {
    console.log('🛑 Limite de tentativas atingido. Reiniciando o cliente...');
    restartClient();
  }
}

// Configuração do cliente
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'default' }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    timeout: 30000,
    ignoreHTTPSErrors: true
  }
});

// Eventos do WhatsApp Web
client.on('qr', generateQRCode);

client.on('authenticated', () => {
  console.log('✅ Cliente autenticado!');
});

client.on('ready', () => {
  isClientReady = true;
  console.log('🚀 Cliente pronto!');
});

client.on('disconnected', async (reason) => {
  console.log(`❌ Cliente desconectado: ${reason}`);
  fs.unlink(path.join(qrCodeDir, 'qrcode.png'), () => {});
  restartClient();
});

// Verificação periódica (5 minutos sem conexão = tentativa de reconectar)
setInterval(() => {
  if (!isClientReady && qrCodeGeneratedAt && (Date.now() - qrCodeGeneratedAt >= 300000)) {
    console.log('⏱️ 5 minutos sem conexão. Tentando reconectar...');
    attemptReconnect();
  }
}, 10000);

// Inicializa o cliente se houver internet
function initializeClient() {
  checkInternetConnection((isConnected) => {
    if (isConnected) {
      client.initialize();
    } else {
      console.log('🌐 Sem internet. Aguardando conexão...');
      setTimeout(initializeClient, 30000);
    }
  });
}

// Rotas da API
app.get('/status', (req, res) => {
  res.json({
    connectionStatus: isClientReady ? 'Conectado' : 'Desconectado',
    qrCodeImage: isQRCodeGenerated ? '/qrcode.png' : null,
    qrCodeGeneratedAt: qrCodeGeneratedAt ? new Date(qrCodeGeneratedAt).toLocaleString() : null
  });
});

app.get('/disconnect', async (req, res) => {
  try {
    await client.destroy();
    console.log('Cliente desconectado.');
    restartClient();
    res.json({ message: 'Cliente desconectado e reiniciado.' });
  } catch (err) {
    console.error('Erro ao desconectar cliente:', err);
    res.status(500).json({ error: 'Erro ao desconectar cliente' });
  }
});

// Servir arquivos estáticos (QR Code)
app.use(express.static(qrCodeDir));

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});

// Inicializar Cliente
initializeClient();

// Função para criar delay
const delay = ms => new Promise(res => setTimeout(res, ms));
// Manipulação de Mensagens
const pedidosPendentes = {};

client.on('message', async (msg) => {
  const chat = await msg.getChat();
  const contact = await msg.getContact();
  const nomeCliente = contact.pushname || "Cliente";

  // Mensagem de boas-vindas e menu principal
if (/^(menu|voltar|oi+|ol[áa]+|e?a[íi]+|opa|fala|e?ae|boa (noite|tarde|dia)|bom (dia|tarde|noite))$/i.test(msg.body)) {
  await chat.sendStateTyping();
    await delay(2000);

    axios.get('https://ceecegril.antoniooliveira.shop/menus_bot.php?action=menu', {
          timeout: 10000 // 10 segundos de timeout
        })
      .then(response => {
    
      const hora = new Date().getHours();
    let saudacao = "Olá";

    if (hora >= 5 && hora < 12) {
        saudacao = "🌅 Bom dia";
    } else if (hora >= 12 && hora < 18) {
        saudacao = "🌞 Boa tarde";
    } else {
        saudacao = "🌙 Boa noite";
    }

    client.sendMessage(msg.from, 
        `${saudacao}, ${nomeCliente.split(" ")[0]}! 😊✨\n\n` +
        `Sou o seu assistente virtual e estou aqui para te ajudar no que precisar! 🤖💙\n\n` +
        `${response.data}\n\n` +
        `Se precisar de algo mais, é só me chamar! 🚀`
    );
      })
      .catch(error => {
        console.error("Erro ao obter menu:", error);
        client.sendMessage(msg.from, "Desculpe, não foi possível obter o menu no momento. Tente novamente mais tarde.");
      });
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

 

      // Adicionamos o item ao mapa com um tempo de expiração
     //MEU ADICIONAR ITENS
 if (msg.body.trim() === '4') {
    await chat.sendStateTyping();
    await delay(2000);

    axios.get('https://ceecegril.antoniooliveira.shop/menus_bot.php?action=cardapio')
        .then(response => client.sendMessage(msg.from, response.data))
        .catch(error => {
            console.error("Erro ao obter cardápio:", error);
            client.sendMessage(msg.from, "❌ Desculpe, não conseguimos obter o cardápio no momento.");
        });

    client.sendMessage(msg.from, 
        "📋 Digite o *ID do seu pedido*, o *ID do produto* e a *quantidade* para adicionar (ex: '123 1 2').\n" +
        "➡️ Após adicionar um item, o *ID do pedido será salvo automaticamente* para os próximos itens.\n" +
        "✏️ Se quiser mudar o ID do pedido, basta informar outro ID normalmente.\n" +
        "🔙 *Para sair, digite 'menu' ou 'sair'.*"
    );

    let idPedidoSalvo = null;
    const telefoneCliente = msg.from;

    // Criando um listener de mensagens para capturar a resposta do usuário
    client.on('message', async (newMsg) => {
        if (newMsg.from !== telefoneCliente) return; // Filtra apenas mensagens do mesmo usuário
        const mensagem = newMsg.body.trim().toLowerCase();

        if (['sair', 'menu'].includes(mensagem)) {
            client.sendMessage(telefoneCliente, "🔙 Saindo do contexto... Digite *menu* caso precise de algo.");
            return;
        }

        let idPedido, idProduto, quantidade;

        if (idPedidoSalvo && /^\d+\s\d+$/.test(mensagem)) {
            [idProduto, quantidade] = mensagem.split(' ');
            idPedido = idPedidoSalvo;
        } else if (/^\d+\s\d+\s\d+$/.test(mensagem)) {
            [idPedido, idProduto, quantidade] = mensagem.split(' ');
            idPedidoSalvo = idPedido;
        } else {
            client.sendMessage(telefoneCliente, "⚠️ Formato inválido. Digite no formato correto:\n🔹 '123 1 2' (ID Pedido, ID Produto, Quantidade)\n🔹 '1 2' (ID Produto, Quantidade) *se já tiver um pedido salvo*.\n\n🔙 *Para sair, digite 'menu' ou 'sair'.*");
            return;
        }

        const qtd = parseInt(quantidade, 10);
        if (isNaN(qtd) || qtd <= 0) {
            client.sendMessage(telefoneCliente, "⚠️ A quantidade deve ser um número inteiro positivo.\n\n🔙 *Para sair, digite 'menu' ou 'sair'.*");
            return;
        }

        axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=adicionar_item&id_pedido=${idPedido}&id_produto=${idProduto}&quantidade=${qtd}&telefone=${telefoneCliente}`)
            .then(response => {
                const resposta = response.data;

                // Log para verificar a resposta da API
                console.log('Resposta da API:', resposta);

                if (resposta.erro) {
                    // Se erro for true, exibe a mensagem de erro
                    client.sendMessage(telefoneCliente, `⚠️ ${resposta.mensagem}\n\n🔙 *Para sair, digite 'menu' ou 'sair'.*`);
                } else {
                    // Exibe a mensagem completa com os detalhes
                    client.sendMessage(telefoneCliente, resposta.mensagem);
                }
            })
            .catch(error => {
                console.error('Erro ao adicionar item:', error);
                client.sendMessage(telefoneCliente, "❌ Erro ao adicionar item ao pedido. Tente novamente.\n\n🔙 *Para sair, digite 'menu' ou 'sair'.*");
            });
    });
}

// Menu 5 - Ver Pedido
if (msg.body.trim() === '5') {
  await chat.sendStateTyping();
  await delay(2000);
  client.sendMessage(msg.from, "Digite o *ID do pedido* para visualizar os detalhes.\nOu digite *voltar*, *menu* ou *sair* para retornar ao menu principal.");

  let isProcessing = false; // Evita múltiplos processamentos simultâneos
  let contextActive = true; // Indica se o usuário ainda está nesse fluxo

  const messageHandler = async (newMsg) => {
    if (!contextActive || isProcessing) return; // Sai se o contexto não estiver ativo ou já estiver processando

    isProcessing = true; // Bloqueia novas execuções até finalizar o processo
    const mensagem = newMsg.body.trim().toLowerCase();

    // Se o usuário sair do fluxo, remove o listener
    if (['voltar', 'menu', 'sair'].includes(mensagem)) {
      client.sendMessage(msg.from, "🔙 Retornando ao menu principal...");
      contextActive = false; // Desativa o fluxo atual
      isProcessing = false;
      client.removeListener('message', messageHandler);
      return;
    }

    // Verifica se o ID do pedido é um número válido
    if (/^\d+$/.test(mensagem)) {
      axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=ver_pedido&id_pedido=${mensagem}`)
        .then(response => {
          if (response.data && response.data.id) {
            let dataFormatada = new Date(response.data.data_pedido).toLocaleString('pt-BR', { 
              day: '2-digit', month: '2-digit', year: 'numeric', 
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            let mensagemResposta = `📦 *Pedido #${response.data.id}*\n📅 *Data:* ${dataFormatada}\n🔹 *Status:* ${response.data.status}\n👤 *Nome:* ${response.data.nome_cliente}\n\n🛒 *Itens do Pedido:*\n`;

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
            client.sendMessage(msg.from, "⚠️ Pedido não encontrado. Verifique o ID informado.");
          }
        })
        .catch(error => {
          console.error("Erro ao buscar pedido:", error);
          client.sendMessage(msg.from, "⚠️ Erro ao buscar pedido. Tente novamente.");
        })
        .finally(() => {
          isProcessing = false; // Libera para novas consultas
        });
    } else {
      client.sendMessage(msg.from, "⚠️ Por favor, digite um ID de pedido válido.");
    }
  };

  client.on('message', messageHandler);
}

  // Menu 2 fazer pedido
 const pedidosPendentes = {};
const ultimosPedidos = {}; // Armazena o timestamp do último pedido de cada usuário
const TEMPO_ESPERA = 30 * 1000; // 30 segundos

if (msg.body.trim() === '2') {
  if (pedidosPendentes[msg.from]) {
    return client.sendMessage(msg.from, "⚠ Você já iniciou um pedido. Digite *Confirmar* para finalizar ou *Voltar* para refazer.");
  }
  
  await chat.sendStateTyping();
  await delay(2000);
  client.sendMessage(msg.from, "Digite o número do *prato* seguido da *quantidade* (exemplo: '1 2' para 2 unidades do prato 1). Para cancelar, digite *Cancelar*.");
  pedidosPendentes[msg.from] = { aguardandoPedido: true };
}

client.on('message', async (newMsg) => {
  if (!pedidosPendentes[newMsg.from]) return; // Ignora mensagens de quem não iniciou um pedido

  const mensagem = newMsg.body.trim();

  if (mensagem.toLowerCase() === 'cancelar') {
    client.sendMessage(newMsg.from, "Pedido cancelado. Caso queira fazer um pedido, digite *2* novamente.");
    delete pedidosPendentes[newMsg.from];
    return;
  }

  if (/^\d+\s?\d+$/.test(mensagem) && pedidosPendentes[newMsg.from].aguardandoPedido) {
    const agora = Date.now();

    // Verifica se o usuário fez um pedido recentemente
    if (ultimosPedidos[newMsg.from] && agora - ultimosPedidos[newMsg.from] < TEMPO_ESPERA) {
      return client.sendMessage(newMsg.from, "⚠ Você já fez um pedido recentemente. Aguarde antes de fazer outro.");
    }

    const [prato, qtd] = mensagem.split(' ');
    const quantidade = parseInt(qtd, 10);

    if (isNaN(quantidade) || quantidade <= 0) {
      return client.sendMessage(newMsg.from, "❌ Erro: A quantidade deve ser um número inteiro positivo.");
    }

    pedidosPendentes[newMsg.from].aguardandoPedido = false; // Evita múltiplas requisições

    axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=verificar_cardapio2&id_produto=${prato}`)
      .then(response => {
        if (response.data?.produto) {
          const { nome, preco } = response.data.produto;
          const valorTotal = preco * quantidade;
          client.sendMessage(
            newMsg.from,
            `🔹 *Seu pedido:*
            🍽 ${nome} x ${quantidade}
            💰 Valor total: R$ ${valorTotal.toFixed(2)}
            🔄 Digite *Confirmar* para finalizar ou *Voltar* para alterar.`
          );
          pedidosPendentes[newMsg.from] = { prato, quantidade, aguardandoConfirmacao: true };
        } else {
          client.sendMessage(newMsg.from, "❌ O prato informado não foi encontrado no cardápio. Tente novamente.");
        }
      })
      .catch(error => {
        console.error("Erro ao verificar cardápio:", error);
        client.sendMessage(newMsg.from, "❌ Erro ao verificar o cardápio. Tente novamente mais tarde.");
      });
  } else if (mensagem.toLowerCase() === 'confirmar' && pedidosPendentes[newMsg.from]?.aguardandoConfirmacao) {
    const { prato, quantidade } = pedidosPendentes[newMsg.from];
    const contact = await newMsg.getContact();
    let nomeCliente = contact.pushname || "Cliente";
    let cliente_telefone = newMsg.from.split('@')[0];

    delete pedidosPendentes[newMsg.from]; // Remove o pedido pendente para evitar duplicação

    axios.get(`https://ceecegril.antoniooliveira.shop/menus_bot.php?action=fazer_pedido2&telefone_cliente=${cliente_telefone}&nome_cliente=${encodeURIComponent(nomeCliente)}&id_produto=${prato}&quantidade=${quantidade}`)
      .then(response => {
        if (response.data.pedido_id) {
          client.sendMessage(newMsg.from, `✅ Pedido registrado com sucesso!
          📝 Número do pedido: *${response.data.pedido_id}*`);
          ultimosPedidos[newMsg.from] = Date.now(); // Registra o horário do pedido
        } else {
          client.sendMessage(newMsg.from, "❌ Erro ao registrar o pedido. Tente novamente.");
        }
      })
      .catch(error => {
        console.error('Erro ao criar pedido:', error);
        client.sendMessage(newMsg.from, "❌ Erro ao registrar o pedido. Tente novamente.");
      });
  } else if (mensagem.toLowerCase() === 'voltar' && pedidosPendentes[newMsg.from]?.aguardandoConfirmacao) {
    client.sendMessage(newMsg.from, "🔄 Pedido cancelado. Digite novamente o número do prato e a quantidade.");
    pedidosPendentes[newMsg.from] = { aguardandoPedido: true };
  } else {
    client.sendMessage(newMsg.from, "❌ Entrada inválida. Digite o número do prato seguido da quantidade. Exemplo: '1 2' para 2 unidades do prato 1.");
  }
});

// client on ready ----------------------final
setInterval(async () => {
  if (!client) {
    console.error('❌ Erro: client não está inicializado.');
    return;
  }

 // console.log('⏳ Executando verificações...');

  try {
    let cliente_telefone = msg?.from?.split('@')[0]; // Evita erro se msg for undefined
    if (!cliente_telefone) {
      console.warn('⚠️ Aviso: msg.from não definido.');
      return;
    }

  //  await verificarPedidos(client);
    await enviarMensagensAniversario(client);
    await verificarCliente(client, cliente_telefone);
    
    await  verificarStatusEPedido(client,cliente_telefone);
  } catch (error) {
    console.error('❌ Erro ao executar verificações:', error);
  }
}, 2 * 60 * 1000);

});
// Mapa para rastrear quantas vezes cada cliente foi avisado
const avisosEnviados = new Map();

// Função para verificar pedidos e atualizar os clientes
const verificarPedidos = async (client) => {
  if (!client) return;

  try {
    const response = await axios.get('https://ceecegril.antoniooliveira.shop/obter_pedidos.php');
    if (!response.data || !response.data.pedidos) return;

    const pedidos = response.data.pedidos;

    for (const { id, telefone_cliente, nome_cliente, status, criado_em } of pedidos) {
      const numeroWhatsApp = `${telefone_cliente}@s.whatsapp.net`;

      try {
        if (status === "aberto") {
          const filaResponse = await axios.get(`https://ceecegril.antoniooliveira.shop/contar_pedidos.php?criado_em=${criado_em}`);
          const { posicao } = filaResponse.data;
      
          if (posicao !== undefined) {
            const avisos = avisosEnviados.get(numeroWhatsApp) || 0;
      
            if (avisos < 6) {
              setTimeout(async () => {
                await client.sendMessage(numeroWhatsApp, `⏳ Olá, ${nome_cliente}! Seu pedido (*ID: ${id}*) está atualmente na posição ${posicao} da nossa fila. Agradecemos pela paciência!`);
                avisosEnviados.set(numeroWhatsApp, avisos + 1);
              }, 3000); // Pequeno atraso para evitar mensagens simultâneas
            }
          }
        }
      } catch (error) {
        console.error(`❌ Erro ao enviar mensagem para ${numeroWhatsApp}:`, error.message);
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao enviar pedido:`, error.message);
  }
};

const verificarSaiu = async (client) => {
  if (!client) return;

  try {
    const response = await axios.get('https://ceecegril.antoniooliveira.shop/obter_pedidos.php');
    if (!response.data || !response.data.pedidos) return;

    const pedidos = response.data.pedidos;

    for (const { id, telefone_cliente, nome_cliente, status } of pedidos) {
      const numeroWhatsApp = `${telefone_cliente}@s.whatsapp.net`;

      try {
        if (status === "saiu") {
          const avisos = avisosEnviados.get(numeroWhatsApp) || 0;
      
          if (avisos < 4) {
            setTimeout(async () => {
              await client.sendMessage(numeroWhatsApp, `🚀 Olá, ${nome_cliente}! Temos uma ótima notícia para você! 🎉\n\nSeu pedido (*ID: ${id}*) já saiu para entrega e em breve estará com você. Fique atento ao telefone e aguarde com expectativa. 🍽️😋\n\nSe precisar de algo, estamos à disposição! Obrigado por escolher a Ceece Gril. 🥩🔥`);
              avisosEnviados.set(numeroWhatsApp, avisos + 1);
            }, 3000); // Pequeno atraso para evitar mensagens simultâneas
          }
        }
      } catch (error) {
        console.error(`❌ Erro ao enviar mensagem para ${numeroWhatsApp}:`, error.message);
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao enviar pedido:`, error.message);
  }
};

// Agendar as verificações com intervalos diferentes
setInterval(() => verificarPedidos(client), 180000); // 3 minutos
setInterval(() => verificarSaiu(client), 120000); // 2 minutos

let enviosHoje = 0; // Variável global para contar os envios no dia
const maxEnviosPorDia = 2; // Limite de envios por dia

const enviarMensagensAniversario = async (client) => {
   // console.log('🎉 Verificando aniversariantes...');
  
    if (!client || typeof client.sendMessage !== 'function') {
        //console.error('❌ Erro: client não está definido corretamente.');
        return;
    }

    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mesHoje = hoje.getMonth() + 1;

    // Reseta o contador de envios ao iniciar um novo dia
    if (hoje.getDate() !== diaHoje) {
        enviosHoje = 0; // Resetando o contador de envios
    }

    try {
        const response = await axios.get('https://ceecegril.antoniooliveira.shop/obter_clientes.php');
        if (!response.data || !Array.isArray(response.data.aniversariantes) || response.data.aniversariantes.length === 0) {
      //      console.error('⚠️ Nenhum aniversariante encontrado.');
            return;
        }
  
        const aniversariantes = response.data.aniversariantes;
       // console.log(`🎂 Aniversariantes obtidos: ${JSON.stringify(aniversariantes)}`);
  
        const numerosEnviados = new Set();
  
        const mensagensAniversario = [
          "🎉 Parabéns, ${nome}! Hoje é o seu dia especial! 🥳 Toda a equipe da CEECE GRIL deseja um dia cheio de alegrias e muitos momentos incríveis! 🎂🎁",
          "🥳 Que alegria celebrar o seu aniversário, ${nome}! Que o seu dia seja repleto de felicidade e que todos os seus desejos se tornem realidade! 🎉",
          "🎂 Feliz aniversário, ${nome}! Esperamos que o seu dia seja repleto de momentos especiais e que o ano novo de vida traga muitas bênçãos para você! 🎁",
          "🎉 Que alegria comemorar mais um ano de vida, ${nome}! Que este seja o melhor ano de todos, cheio de conquistas e momentos inesquecíveis! 🎂🎈",
          "🥳 Feliz aniversário, ${nome}! Que o seu dia seja tão especial quanto você! Que a felicidade esteja sempre ao seu lado! 🎉",
          "🎂 Parabéns, ${nome}! Que a vida continue te presenteando com momentos incríveis e muito sucesso. Tenha um dia maravilhoso! 🎁",
          "🎉 Hoje é o seu dia, ${nome}! Desejamos que seja um aniversário inesquecível, cheio de alegria e amor! 🥳🎂",
          "🥳 Feliz aniversário, ${nome}! Que todos os seus sonhos se realizem e que sua vida seja cheia de felicidade e conquistas! 🎉",
          "🎂 Parabéns, ${nome}! Que o seu novo ano de vida seja repleto de sucesso, saúde e muitas realizações. Aproveite seu dia! 🎁",
          "🎉 Que neste aniversário você se sinta rodeado de carinho e amor, ${nome}! Que a felicidade invada o seu coração neste dia tão especial! 🎂",
          "🥳 Feliz aniversário, ${nome}! Que você continue sendo essa pessoa maravilhosa e que todos os seus desejos se realizem! 🎉",
          "🎂 Parabéns, ${nome}! Que a sua vida seja uma jornada de alegrias, realizações e muito sucesso! Aproveite cada segundo do seu dia! 🎁",
          "🎉 Que o seu aniversário seja tão incrível quanto você, ${nome}! Que a felicidade, amor e sucesso te acompanhem sempre! 🥳",
          "🥳 Feliz aniversário, ${nome}! Que esse novo ano de vida seja ainda melhor que o anterior, cheio de momentos inesquecíveis! 🎂🎁",
          "🎂 Parabéns, ${nome}! Que a vida te reserve muitos sorrisos, alegrias e sucesso. Tenha um dia maravilhoso e um ano incrível! 🎉",
          "🎉 Feliz aniversário, ${nome}! Que você tenha um dia repleto de alegria, rodeado de pessoas especiais e momentos felizes! 🎂🎁",
          "🥳 Parabéns, ${nome}! Que neste dia especial você receba muitas energias positivas e que o novo ano de vida seja incrível! 🎉",
          "🎂 Feliz aniversário, ${nome}! Desejamos que você continue brilhando e alcançando seus objetivos com muito sucesso! 🎁",
          "🎉 Que a vida continue te sorrindo, ${nome}! Que este aniversário seja o começo de mais um ciclo repleto de felicidades! 🥳",
          "🥳 Feliz aniversário, ${nome}! Que sua jornada seja repleta de amor, paz e muitos momentos felizes! 🎂🎁",
          "🎂 Parabéns, ${nome}! Que o seu aniversário seja o reflexo de tudo o que você merece: felicidade, amor e sucesso! 🎉",
          "🎉 Feliz aniversário, ${nome}! Que a cada novo dia você possa conquistar ainda mais. Aproveite o seu dia com muita alegria! 🥳",
          "🥳 Parabéns, ${nome}! Que esse novo ano de vida seja repleto de realizações e que você continue sendo uma pessoa inspiradora! 🎂🎁",
          "🎂 Feliz aniversário, ${nome}! Que a felicidade te acompanhe por todos os caminhos e que seus sonhos se tornem realidade! 🎉",
          "🎉 Parabéns, ${nome}! Que seu aniversário seja só o começo de um ano maravilhoso, cheio de saúde, amor e conquistas! 🥳",
          "🥳 Feliz aniversário, ${nome}! Que você celebre este dia com muita alegria e que cada desejo seu se realize! 🎂🎁",
          "🎂 Parabéns, ${nome}! Que o seu novo ano de vida seja iluminado por muitas vitórias e que você continue conquistando seus sonhos! 🎉",
          "🎉 Feliz aniversário, ${nome}! Que sua vida seja uma eterna celebração de felicidade, amor e sucesso! 🥳🎂",
          "🥳 Parabéns, ${nome}! Que neste dia especial você se sinta cercado de boas energias e que todos os seus desejos se realizem! 🎉",
          "🎂 Feliz aniversário, ${nome}! Que seu dia seja inesquecível e que o novo ano traga muitas alegrias e conquistas! 🎁",
          "🎉 Que neste aniversário você se sinta ainda mais realizado e cheio de boas energias, ${nome}! 🎂🎁",
          "🥳 Feliz aniversário, ${nome}! Que seu dia seja repleto de surpresas boas e que o novo ciclo seja cheio de momentos felizes! 🎉",
          "🎂 Parabéns, ${nome}! Que o seu aniversário seja uma grande celebração de felicidade e que o novo ano traga ainda mais sucesso! 🎁",
          "🎉 Feliz aniversário, ${nome}! Que seu dia seja repleto de amor, paz e muita alegria, com muitas conquistas pela frente! 🥳"
        ];
      
      
      

        for (const { nome, telefone, aniversario } of aniversariantes) {
            if (enviosHoje >= maxEnviosPorDia) {
          //      console.log('🚫 Limite de envios atingido para o dia.');
                break; // Interrompe o envio se o limite for atingido
            }

           // console.log(`📅 Verificando aniversário de ${nome} com data ${aniversario}`);
              
            if (!aniversario) {
             //   console.warn(`⚠️ Data de aniversário inválida para ${nome}`);
                continue;
            }
  
            const [ano, mes, dia] = aniversario.split('-').map(Number);
  
            if (dia === diaHoje && mes === mesHoje) {
                const numeroWhatsApp = `${telefone.replace(/\s+/g, '')}@s.whatsapp.net`;
  
                if (numerosEnviados.has(numeroWhatsApp)) {
                 //   console.log(`📱 Mensagem já enviada para ${nome}`);
                    continue;
                }
  
               // console.log(`🎊 Aniversariante encontrado: ${nome}, enviando mensagem para ${numeroWhatsApp}`);
  
                const mensagem = mensagensAniversario[Math.floor(Math.random() * mensagensAniversario.length)].replace("${nome}", nome);
  
                try {
                    await client.sendMessage(numeroWhatsApp, mensagem);
                   // console.log(`✅ Mensagem de aniversário enviada para ${nome}`);
                    numerosEnviados.add(numeroWhatsApp);
                    enviosHoje++; // Incrementa o contador de envios
                } catch (error) {
                    console.error(`❌ Erro ao enviar mensagem de aniversário para ${nome}:`, error.message);
                }
            }
        }
    } catch (error) {
        console.error('❌ Erro ao obter aniversariantes:', error.message);
    }
};



const verificarCliente = async (client, cliente_telefone) => {
    //console.log('🔍 Verificando cliente...');

    if (!client || typeof client.sendMessage !== 'function') {
        console.error('❌ Erro: client não está definido corretamente.');
        return;
    }

    if (!cliente_telefone) {
        console.error('⚠️ Número de telefone não fornecido.');
        return;
    }

    //console.log("📢 Telefone procurado:", cliente_telefone);
    try {
        const response = await axios.get(`https://ceecegril.antoniooliveira.shop/verificar_data_nascimento.php?telefone=${cliente_telefone}`);
       // console.log("📢 Resposta da API de verificação de cliente:", response.data);

        if (response.data.erro) {
         //   console.error(`⚠️ Erro: ${response.data.erro}`);

            if (response.data.erro.includes('sem data de nascimento')) {
                const numeroWhatsApp = formatarNumero(cliente_telefone);
                await client.sendMessage(numeroWhatsApp, `📅 Olá! Por favor, envie sua data de nascimento no formato DD/MM/AAAA.`);

                // ⏳ Aguarda a resposta do cliente
                const resposta = await esperarResposta(client, numeroWhatsApp);

                if (resposta) {
                   // console.log("📅 Resposta recebida:", resposta);

                    if (!validarData(resposta)) {
                        await client.sendMessage(numeroWhatsApp, `⚠️ Formato inválido. Envie a data no formato DD/MM/AAAA.`);
                        return;
                    }

                    const atualizarResponse = await atualizarDataNascimento(cliente_telefone, resposta);
                   // console.log("📢 Resposta da API de atualização:", atualizarResponse);

                    if (atualizarResponse.status === 'sucesso') {
                        await client.sendMessage(numeroWhatsApp, `🎉 Sua data de nascimento foi registrada com sucesso!`);
                    } else {
                        await client.sendMessage(numeroWhatsApp, `⚠️ Ocorreu um erro ao registrar sua data de nascimento. Tente novamente.`);
                    }
                } else {
           //         console.error("⚠️ Nenhuma resposta recebida do cliente.");
                }
            }
            return;
        }
    } catch (error) {
        //console.error('❌ Erro ao verificar o cliente:', error.message);
    }
};

// 🕐 Aguarda a resposta do cliente com a data de nascimento
const esperarResposta = async (client, numeroWhatsApp) => {
   // console.log("⏳ Aguardando resposta do cliente...");

    return new Promise((resolve) => {
        client.on('message', (message) => {
            const numeroFormatado = formatarNumero(message.from);

           // console.log("📩 Mensagem recebida:", message.body, "De:", numeroFormatado);

            if (numeroFormatado === numeroWhatsApp) {
                resolve(message.body.trim()); 
            }
        });
    });
};

// 📅 Função para validar a data no formato DD/MM/AAAA
const validarData = (data) => {
    return /^(\d{2})\/(\d{2})\/(\d{4})$/.test(data);
};
const formatarNumero = (numero) => {
  // Remove qualquer sufixo (@c.us ou @s.whatsapp.net)
  let numeroLimpo = numero.replace(/(@c.us|@s.whatsapp.net)/, '');

  // Se não começar com "55" (Brasil), adicione
  if (!numeroLimpo.startsWith('55')) {
      numeroLimpo = '55' + numeroLimpo;
  }

  return numeroLimpo + '@c.us'; // Sempre retorna no formato correto
};

// 📤 Função para atualizar a data de nascimento no backend
const atualizarDataNascimento = async (telefone, dataNascimento) => {
    try {
        //console.log("📅 Enviando dados para atualização:", { telefone, data_nascimento: dataNascimento });

        const response = await axios.post('https://ceecegril.antoniooliveira.shop/atualizar_data_nascimento.php', {
            telefone: telefone,
            data_nascimento: dataNascimento
        });

      //  console.log("📢 Resposta da API de atualização:", response.data);
        return response.data;
    } catch (error) {
        //console.error('❌ Erro ao atualizar data de nascimento:', error.message);
        return { status: 'erro' };
    }
};
// 📤 Função para verificar o status do pedido e enviar mensagem
// 📤 Função para verificar o status do pedido e enviar mensagem
const enviados = new Set(); // Armazena números que já receberam a mensagem

const verificarStatusEPedido = async (client, telefone) => {
  try {
      // Se o número já recebeu a mensagem, não faz nada
      if (enviados.has(telefone)) {
          //console.log("✅ Mensagem já enviada para este número:", telefone);
          return;
      }

      // Enviando o número de telefone para verificar o status do pedido
      const response = await axios.post('https://ceecegril.antoniooliveira.shop/verificar_status_pedido.php', {
          telefone: telefone
      });

      // Verificando a resposta da API
      if (response.data.status === 'concluido') {
          // Supondo que o número do WhatsApp do cliente é retornado da API ou já seja conhecido
          const numeroWhatsApp = `${telefone}`; 

          // Enviar mensagem usando o cliente (exemplo com client.sendMessage)
          await client.sendMessage(numeroWhatsApp, `🎉 Seu Pedido Foi Concluído com Sucesso! \nObrigado por escolher a CEECE Grill! 🍽️`);

          // Adiciona o telefone à lista de enviados
          enviados.add(telefone);
      } else {
          //console.log("❌ Pedido não concluído ou não encontrado.");
      }

      return response.data;
  } catch (error) {
      //console.error('❌ Erro ao verificar o status do pedido:', error.message);
      return { status: 'erro' };
  }
};
