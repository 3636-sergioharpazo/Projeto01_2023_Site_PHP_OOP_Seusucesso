// Importações
const qrcode = require('qrcode-terminal'); // QR Code para terminal
const qrcodeWeb = require("qrcode"); // QR Code para imagem web
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
    }

    // Se a conexão estiver estabelecida, redireciona para a página "Conectado"
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
client.on('ready', () => {
  console.log('Tudo certo! WhatsApp conectado.');
});

const delay = ms => new Promise(res => setTimeout(res, ms));
// Manipulação de Mensagens
const pedidosPendentes = {};

client.on('message', async (msg) => {
  const chat = await msg.getChat();
  const contact = await msg.getContact();
  const nomeCliente = contact.pushname || "Cliente";

  // Mensagem de boas-vindas e menu principal
 if (/^(menu|oi|Oi|ol[áa]|boa noite|bom dia)$/i.test(msg.body)) {
    await chat.sendStateTyping();
    await delay(2000);

    axios.get('https://ceecegril.antoniooliveira.shop/menus_bot.php?action=menu', {
          timeout: 10000 // 10 segundos de timeout
        })
      .then(response => {
        client.sendMessage(msg.from, `Olá, ${nomeCliente.split(" ")[0]}! 👋\n\n${response.data}`);
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

  client.sendMessage(msg.from, "Digite o *ID do seu pedido*, o *ID do produto* e a *quantidade* para adicionar (ex: '123 1 2').\nOu digite 'voltar' ou 'menu' para retornar ao menu principal.");

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
  client.sendMessage(msg.from, "Digite o *ID do pedido* para visualizar os detalhes.\nOu digite *voltar* ou *menu* para retornar ao menu principal.");

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
  client.sendMessage(msg.from, "Digite o número do *prato* seguido da *quantidade* (exemplo: '1 2' para 2 unidades do prato 1).");

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

 // console.log('⏳ Executando verificações...');

  try {
    let cliente_telefone = msg?.from?.split('@')[0]; // Evita erro se msg for undefined
    if (!cliente_telefone) {
      console.warn('⚠️ Aviso: msg.from não definido.');
      return;
    }

    await verificarPedidos(client);
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
  if (!client) {
    //console.error('❌ Erro: client não está definido.');
    return;
  }

  //console.log('📦 Iniciando verificação de pedidos...');
  try {
    const response = await axios.get('https://ceecegril.antoniooliveira.shop/obter_pedidos.php');
    if (!response.data || !response.data.pedidos) {
      //console.error('⚠️ Nenhum pedido encontrado.');
      return;
    }

    const pedidos = response.data.pedidos;

    for (const { id, telefone_cliente, nome_cliente, status, criado_em } of pedidos) {
      const numeroWhatsApp = `${telefone_cliente}@s.whatsapp.net`; // Formato correto

      try {
        if (status === "aberto") {
          // Obtém a posição na fila
          const filaResponse = await axios.get(`https://ceecegril.antoniooliveira.shop/contar_pedidos.php?criado_em=${criado_em}`);
          const { posicao } = filaResponse.data;
      
          if (posicao !== undefined) {
            // Obtém quantos avisos já foram enviados para esse cliente
            const avisos = avisosEnviados.get(numeroWhatsApp) || 0;
      
            if (avisos < 6) { // Limite de 6 avisos
              await client.sendMessage(numeroWhatsApp, `⏳ Olá, ${nome_cliente}! Seu pedido (*ID: ${id}*) está atualmente na posição ${posicao} da nossa fila. Agradecemos pela paciência!`);
              avisosEnviados.set(numeroWhatsApp, avisos + 1);
            }
          }
        } else if (status === "saiu") {
          // Obtém quantos avisos já foram enviados para esse cliente
          const avisos = avisosEnviados.get(numeroWhatsApp) || 0;
      
          if (avisos < 4) { // Limite de 4 avisos para o status "saiu"
            await client.sendMessage(numeroWhatsApp, `🚀 Olá, ${nome_cliente}! Temos uma ótima notícia para você! 🎉

Seu pedido (*ID: ${id}*) já saiu para entrega e em breve estará com você. Fique atento ao telefone e aguarde com expectativa. 🍽️😋

Se precisar de algo, estamos à disposição! Obrigado por escolher a Ceece Gril. 🥩🔥`);
            avisosEnviados.set(numeroWhatsApp, avisos + 1);
          }
        }
      } catch (error) {
        //console.error(`❌ Erro ao enviar mensagem para ${numeroWhatsApp}:`, error.message);
      }

    } // Aqui fechamos o "for" corretamente
  } catch (error) {
    console.error(`❌ Erro ao enviar pedido:`, error.message);
  }
} // Aqui fechamos a função corretamente
  
  


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
