const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf'); // Para remover diretórios não vazios
const express = require('express');
const axios = require('axios');
const { exec } = require('child_process');
const app = express();

const PORT = 3003;
const qrCodeDir = '/var/www/html/bot2';  // Diretório onde o QR será salvo
require('events').EventEmitter.defaultMaxListeners = 100; // Ou um número maior, se necessário

let isQRCodeGenerated = false; // Controle para evitar a repetição do QR Code
let qrCodeGeneratedAt = null;  // Timestamp da geração do QR Code
let sessionData = null; // Armazena a sessão do cliente
let reconnectAttempts = 0;  // Conta tentativas de reconexão

// Função para gerar o QR Code e salvar
function generateQRCode(qr) {
  const qrCodePath = path.join(qrCodeDir, 'qrcode.png');
  fs.unlink(qrCodePath, (unlinkErr) => {
    qrcode.toDataURL(qr, (err, url) => {
      if (err) {
        console.error('Erro ao gerar o QR Code:', err);
        return;
      }
      const base64Data = url.replace(/^data:image\/png;base64,/, '');
      fs.writeFile(qrCodePath, base64Data, 'base64', (writeErr) => {
        if (writeErr) {
          console.error('Erro ao salvar o QR Code:', writeErr);
        } else {
          console.log(`QR Code gerado e salvo com sucesso em: ${qrCodePath}`);
          isQRCodeGenerated = true;
          qrCodeGeneratedAt = Date.now();
        }
      });
    });
  });
}

// Função para reiniciar o cliente e gerar um novo QR Code
function restartClient() {
  console.log('Reiniciando o cliente para gerar um novo QR Code...');
  reconnectAttempts = 0; // Reseta as tentativas de reconexão
  client.removeAllListeners();
  isQRCodeGenerated = false;
  qrCodeGeneratedAt = null;

  // Remover a pasta inteira de sessão
  const sessionDir = path.join(qrCodeDir, '.wwebjs_auth/session-default');
  rimraf(sessionDir, (err) => {
    if (err) {
      console.error('Erro ao remover a sessão:', err);
    } else {
      console.log('Sessão removida com sucesso.');
    }
    client.initialize(); // Reinicializa o cliente após a limpeza
  });
}

// Função para tentar restabelecer a conexão automaticamente
function attemptReconnect() {
  console.log('Tentando restabelecer a conexão...');
  reconnectAttempts++;
  if (reconnectAttempts <= 10) {
    client.initialize(); // Tenta reconectar
  } else {
    console.log('🛑 Tentativas de reconexão excedidas. Reiniciando o cliente com um novo QR Code...');
    restartClient(); // Reinicia o cliente após 10 tentativas
  }
}

// Função para verificar conexão com a internet (ping ao Google)
function checkInternetConnection(callback) {
  exec('ping -c 1 google.com', (error, stdout, stderr) => {
    if (error) {
      console.log('🌐 Sem conexão com a internet.');
      callback(false);
    } else {
      console.log('🌐 Conexão de internet verificada.');
      callback(true);
    }
  });
}

// Configuração do cliente com LocalAuth
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'bot2'
  }),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    timeout: 180000, // 180 segundos
    ignoreHTTPSErrors: true
  }
});

// Eventos do cliente
client.on('qr', (qr) => {
  console.log('QR RECEBIDO');
  generateQRCode(qr);
});

client.on('authenticated', (session) => {
  console.log('✅ Autenticado com sucesso!');
  sessionData = session;
});

let isClientReady = false;
client.on('ready', () => {
   isClientReady = true;
  console.log('🚀 WhatsApp Web está pronto!');
  console.log('Cliente conectado com sucesso!');
});
// Endpoint para fornecer o status e QR Code para o frontend
app.get('/status', (req, res) => {
  if (isClientReady) {
    res.json({ connectionStatus: 'Conectado' });
  } else {
    res.json({
      connectionStatus: 'Desconectado!',
      qrCodeImage: '/qrcode.png',
      qrCodeGeneratedAt: qrCodeGeneratedAt ? new Date(qrCodeGeneratedAt).toLocaleString() : null
    });
  }
});





client.on('disconnected', (reason) => {
  console.log(`❌ Cliente desconectado: ${reason}`);
  attemptReconnect();
});

// Verifica a cada 10 segundos se passaram 5 minutos sem conexão e tenta reconectar
setInterval(() => {
  if (!client.isReady && qrCodeGeneratedAt) {
    const elapsed = Date.now() - qrCodeGeneratedAt;
    if (elapsed >= 300000) { // 5 minutos
      console.log('⏱️ 5 minutos sem conexão. Tentando restabelecer a conexão...');
      attemptReconnect();
    }
  }
}, 10000);

// Inicializa o cliente somente se houver conexão com a internet
checkInternetConnection((isConnected) => {
  if (isConnected) {
    client.initialize();
  } else {
    console.log('Aguardando conexão com a internet...');
  }
});

// Servir arquivos estáticos da pasta onde o QR Code foi salvo
app.use(express.static(qrCodeDir));

// Inicia o servidor Express
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});



// Função para criar delay
const delay = ms => new Promise(res => setTimeout(res, ms));


// Variáveis para armazenar os dados do cliente e do agendamento
let cliente_nome = '';
const clientesRespondidos = {}; // Cache para armazenar clientes que já responderam
     
   


client.on('message', async msg => {
    
 if (/^(menu|Menu|dia|tarde|noite|oi|Oi|Voltar|voltar|Olá|olá|ola|Ola)$/i.test(msg.body) && msg.from.endsWith('@c.us')) {
        
   const chat = await msg.getChat();
        const contact = await msg.getContact();
    const name = contact.pushname || "Cliente";
       await delay(2000);
        await chat.sendStateTyping();
        await delay(2000);

        await client.sendMessage(
            msg.from,
            `Olá, ${name.split(" ")[0]}! 👋 Eu sou o assistente virtual do *Lojas Terel*. Como posso ajudá-lo(a) hoje? Escolha uma das opções abaixo:\n\n` +
            `1️⃣ - Serviços e preços\n` +
            `2️⃣ - Brindes \n` +
            `3️⃣ - Promoções da semana\n` +
            `4️⃣ - Localização\n` +
            `5️⃣ - Outras dúvidas\n` +
            `6️⃣ - Consultar seu cupom`
        );
      }
  // Menu 2
 if (msg.body.trim().toLowerCase() === 'c' && msg.from.endsWith('@c.us')) {
  const chat = await msg.getChat();
  await delay(2000);
  await chat.sendStateTyping();
  await delay(2000);

  let cliente_nome = null;
  let data_nascimento = null;
  let protocolo = '';
  let confirmacao = false;
  let cliente_telefone = msg.from.split('@')[0];

  async function solicitarCampo(mensagem, mensagemValidacao, regex = null, mensagemConfirmacao = '') {
      let campoValido = false;
      let campo = null;

      while (!campoValido) {
          await client.sendMessage(msg.from, mensagem);
          const resposta = await esperarMensagem(msg.from);

          if (resposta.toLowerCase() === 'menu') {
              await client.sendMessage(msg.from, '🔙 Retornando ao menu principal.');
              return null;
          }

          if (regex && !regex.test(resposta)) {
              await client.sendMessage(msg.from, mensagemValidacao);
          } else {
              campoValido = true;
              campo = resposta;
          }
      }

      if (mensagemConfirmacao) {
          await client.sendMessage(msg.from, `✅ ${mensagemConfirmacao}: ${campo}`);
      }

      return campo;
  }

  async function esperarMensagem(user) {
      return new Promise((resolve) => {
          const listener = (response) => {
              if (response.from === user) {
                  client.off('message', listener);
                  resolve(response.body.trim());
              }
          };
          client.on('message', listener);
      });
  }

  let lojas = {
      "a": "Loja01",
      "b": "Loja02"
  };
  let lojaEscolhida = null;

  await client.sendMessage(
      msg.from,
      `🌟 *Cadastro de Colaborador(a)* 🌟\n\n` +
      `Escolha a loja onde você trabalha:\n\n` +
      `🅰 Loja01\n` +
      `🅱 Loja02\n\n` +
      `Digite apenas a letra correspondente (*A* ou *B*).`
  );

  while (!lojaEscolhida) {
      let escolha = await esperarMensagem(msg.from);
      escolha = escolha.toLowerCase();
      if (escolha === 'menu') {
          await client.sendMessage(msg.from, '🔙 Retornando ao menu principal.');
          return;
      }
      if (lojas[escolha]) {
          lojaEscolhida = lojas[escolha];
      } else {
          await client.sendMessage(msg.from, '❌ Opção inválida! Digite *A* para Loja01 ou *B* para Loja02.');
      }
  }

  cliente_nome = await solicitarCampo(
      'Digite seu *Nome Completo:*',
      '❌ Nome inválido. Por favor, envie seu nome completo sem números.', 
      /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/,  
      'Nome recebido'
  );
  if (!cliente_nome) return;

  data_nascimento = await solicitarCampo(
      'Digite sua *Data de Nascimento* (DD/MM/AAAA):',
      '❌ Data inválida! Envie no formato DD/MM/AAAA.', 
      /^\d{2}\/\d{2}\/\d{4}$/, 
      'Data recebida'
  );
  if (!data_nascimento) return;

  let email = `${cliente_telefone}@lojasterel.com.br`;

  await client.sendMessage(
      msg.from,
      `📝 Confirme as informações:\n\n` +
      `👤 Nome: ${cliente_nome}\n` +
      `🏬 Loja: ${lojaEscolhida}\n` +
      `📧 E-mail: ${email}\n` +
      `📅 Data de Nascimento: ${data_nascimento}\n\n` +
      `Digite *Sim* ✅ para confirmar\nDigite *Cancelar* ❌ para cancelar e voltar ao menu principal\nDigite *Menu* para retornar ao menu principal.`
  );

  const resposta = await esperarMensagem(msg.from);
 if (resposta.toLowerCase() !== 'sim') {
  await client.sendMessage(msg.from, '❌ Cadastro cancelado. Retornando ao menu principal.');
  return;
 }

 // Confirmação antes de enviar os dados
 await client.sendMessage(msg.from, '✅ Dados confirmados. Enviando informações...');

 try {
  const protocoloResponse = await axios.post('https://lojamaster.antoniooliveira.shop/processa_colaborador_bot.php', {
      cliente_nome,
      cliente_telefone,
      loja: lojaEscolhida,
      email,
      data_nascimento
  });

  console.log(protocoloResponse.data); // Log para depuração

  protocolo = protocoloResponse.data.protocolo || null; 
 } catch (error) {
  console.error('Erro ao processar o protocolo:', error);
  await client.sendMessage(msg.from, '❌ Houve um erro ao processar seus dados. Tente novamente.');
 }
  if (protocolo) {
          await client.sendMessage(
              msg.from,
              `✅ *Cadastro Confirmado!*\n` +
              `📜 *Protocolo:* ${protocolo}\n` +
              `👤 *Nome:* ${cliente_nome}\n` +
              `🏬 *Loja:* ${lojaEscolhida}\n` +
              `📧 *E-mail:* ${email}\n` +
              `📅 *Data de Nascimento:* ${data_nascimento}`
          );
      } else {
          await client.sendMessage(msg.from, '❌ Erro ao confirmar o cadastro. Tente novamente.');
      }

    
 let usuario_responsavel = "Loja01";
 //let cliente_telefone = msg.from.split('@')[0];

 // Variável controladora que vai armazenar os protocolos enviados
 let protocolosEnviadosHoje = {};

 // Obtendo a data de hoje no formato YYYY-MM-DD
 const dataHoje = new Date().toISOString().split('T')[0];

 // Verificando se o protocolo já foi enviado para o cliente hoje
 if (!protocolosEnviadosHoje[cliente_telefone] || protocolosEnviadosHoje[cliente_telefone] !== dataHoje) {
    // Se não foi enviado, faz o envio do protocolo
    await axios.post('https://lojamaster.antoniooliveira.shop/Bot/gerar_protocolo.php', {
        cliente_nome: name,
        cliente_telefone,
        usuario_responsavel
    });

    // Marca que o protocolo foi enviado hoje para este cliente
    protocolosEnviadosHoje[cliente_telefone] = dataHoje;

    console.log("Cadastro disparado com sucesso para", usuario_responsavel, name, cliente_telefone);
 } else {
    console.log("Protocolo já enviado hoje para", cliente_telefone);
 }

    // Resposta para "Localização"
if (msg.body.trim() === '4' && msg.from.endsWith('@c.us')) {
      const chat = await msg.getChat();
        await delay(2000);
        await chat.sendStateTyping();
        await delay(2000);

        await client.sendMessage(
            msg.from,
            `📍 *Localização das Lojas Terel* 📍\n\n` +
            `Endereço: Vila São José, Centro\n` +
            `Cidade: São Paulo - SP\n\n` +
            `Estamos ansiosos para sua visita! 😊`
        );
    }

    // Resposta para "Promoções da Semana"
if (msg.body.trim() === '3' && msg.from.endsWith('@c.us')) {
      const chat = await msg.getChat();
        await delay(2000);
        await chat.sendStateTyping();
        await delay(2000);

        let servicosDisponiveis = {};
        try {
            const response = await axios.get('https://lojamaster.antoniooliveira.shop/Bot/consultar-servicos_bot_p.php');
            servicosDisponiveis = response.data.servicos;
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            await client.sendMessage(msg.from, '❌ Erro ao consultar serviços. Tente novamente mais tarde.');
            return;
        }

        const listaServicos = Object.entries(servicosDisponiveis)
            .map(([codigo, { nome, preco }]) => ` ${nome} - R$ ${preco}`)
            .join('\n');

        await client.sendMessage(
            msg.from,
            `🎉 *Promoções da Semana* 🎉\n\n` +
            `📝\n${listaServicos}\n` +
            `Aproveite essas ofertas incríveis! Válidas até sábado. 💅\n\n` + 
            `Digite *2* para faça seu cadastro!\n`
        );
    }

    // Resposta para "Outras Dúvidas"
if (msg.body.trim() === '5' && msg.from.endsWith('@c.us')) {
      const chat = await msg.getChat();
        await delay(2000);
        await chat.sendStateTyping();
        await delay(2000);

        await client.sendMessage(
            msg.from,
            `❓ *Outras Dúvidas* ❓\n\n` +
            `Por favor, descreva sua dúvida que entraremos em contato para ajudá-lo(a).`
        );
    }

 

    // Resposta para a opção "Serviços e Preços"
if (msg.body.trim() === '1' && msg.from.endsWith('@c.us')) {
      const chat = await msg.getChat();
        await delay(2000);
        await chat.sendStateTyping();
        await delay(2000);

        let servicosDisponiveis = {};
        try {
            const response = await axios.get('https://lojamaster.antoniooliveira.shop/Bot/consultar-servicos_bot.php');
            servicosDisponiveis = response.data.servicos;
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            await client.sendMessage(msg.from, '❌ Erro ao consultar serviços. Tente novamente mais tarde.');
            return;
        }

        const listaServicos = Object.entries(servicosDisponiveis)
            .map(([codigo, { nome, preco }]) => ` ${nome} - R$ ${preco}`)
            .join('\n');

        await client.sendMessage(
            msg.from,
            `💇‍♀️ *Produtos e Preços* 💇‍♂️\n\n` +
            `📦 *Confira nossos produtos e preços abaixo:*\n${listaServicos}\n\n` +
            `🔹 Digite *2* para faça seu cadastro!`
        );
    }

  
    // Menu 2: Ganhar Brindes
if (msg.body.trim() === '2' && msg.from.endsWith('@c.us')) {
        (async () => {
            const chat = await msg.getChat();
            await delay(2000);
            await chat.sendStateTyping();
            await delay(2000);

            let cliente_nome = '';
            let cliente_telefone = msg.from.split('@')[0];
            let protocolo = '';
            let confirmacao = false;

            async function solicitarCampo(campo, mensagemValidacao, regex = null, mensagemConfirmacao = '') {
                let campoValido = false;
                while (!campoValido) {
                    if (!campo || (regex && typeof campo === 'string' && !regex.test(campo))) {
                        await client.sendMessage(msg.from, mensagemValidacao);
                        const resposta = await esperarMensagem(msg.from);
                        
                        if (resposta.trim().toLowerCase() === 'menu') {
                            await client.sendMessage(msg.from, '🔙 Retornando ao menu principal.');
                            return null;
                        }
                        campo = resposta.trim();
                    } else {
                        campoValido = true;
                    }
                }

                if (mensagemConfirmacao) {
                    await client.sendMessage(msg.from, `✅ ${mensagemConfirmacao}: ${campo}`);
                }
                return campo;
            }

            async function esperarMensagem(user) {
                return new Promise((resolve) => {
                    const listener = (response) => {
                        if (response.from === user) {
                            client.off('message', listener);
                            resolve(response.body);
                        }
                    };
                    client.on('message', listener);
                });
            }

            let servicosDisponiveis = {};
            try {
                const response = await axios.get('https://lojamaster.antoniooliveira.shop/Bot/consultar-servicos_bot.php');
                servicosDisponiveis = response.data.servicos;
            } catch (error) {
                console.error("Erro ao buscar serviços:", error);
                await client.sendMessage(msg.from, '❌ Erro ao consultar serviços. Tente novamente mais tarde.');
                return;
            }

            await client.sendMessage(msg.from, 
                `🌟 *Ganhar brindes* 🌟\n\n` +
                `Digite *Nome Completo:*\n\n` +
                `Digite *Menu* para retornar ao menu principal.`
            );

            cliente_nome = await solicitarCampo(
                null, 
                '❌ Nome inválido. Por favor, envie seu nome completo sem números.', 
                /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:\s[A-Za-zÀ-ÖØ-öø-ÿ]+)*$/,
                'Nome recebido'
            );

            if (!cliente_nome) return;

            await client.sendMessage(msg.from,
                `📝 Confirme as informações:\n\n` +
                `Nome: ${cliente_nome}\n` +
                `Digite *Sim* ✅ para confirmar\nDigite *Cancelar* ❌ para cancelar e voltar ao menu principal\nDigite *Menu* para retornar ao menu principal.`
            );

            const resposta = await esperarMensagem(msg.from);
            if (resposta.trim().toLowerCase() !== 'sim') {
                await client.sendMessage(msg.from, '❌ Agendamento cancelado. Retornando ao menu principal.');
                return;
            }

            let usurio_responsavel = "Brindes";
            try {
                const protocoloResponse = await axios.post('https://lojamaster.antoniooliveira.shop/Bot/gerar_protocolo.php', {
                    cliente_nome,
                    cliente_telefone,
                    usurio_responsavel
                });

                protocolo = protocoloResponse.data.protocolo;

                if (protocolo) {
                    await client.sendMessage(msg.from,
                        `✅ *Você está cadastrado e Confirmado!*\n` +
                        `📜 *Protocolo:* ${protocolo}\n` +
                        `👤 *Nome:* ${cliente_nome}\n`
                    );
                } else {
                    await client.sendMessage(msg.from, '❌ Erro ao gerar protocolo. Tente novamente.');
                }
            } catch (error) {
                console.error("Erro no cadastro:", error);
                await client.sendMessage(msg.from, '❌ Erro ao cadastrar, tente novamente!');
            }
        })();
    }
  }

 
});



// Função delay
/*async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
*/
const agendamentosNotificados = new Set();

async function enviarFelizAniversario() {
    try {
        // Faz a requisição para pegar os aniversariantes
        const response = await axios.get('http://lojamaster.antoniooliveira.shop/consultar-data_nascimento_bot.php');

        // Debug: imprimir a resposta
        //console.log('📌 Resposta da API:', response.data);

        // Verifica se há aniversariantes
        if (!response || !response.data || !Array.isArray(response.data.usuarios) || response.data.usuarios.length === 0) {
            console.log('⚠️ Nenhum aniversário encontrado hoje.');
            return;
        }

        const usuarios = response.data.usuarios;

        // Envia mensagem para cada usuário e também para o WhatsApp da Cheve
        for (const usuario of usuarios) {
            // Verificar se o nome está correto na resposta da API
            const cliente_nome = usuario.cliente_nome ? usuario.cliente_nome.trim() : "Anônimo"; // Tratar espaços extras no nome
            const cliente_telefone = usuario.cliente_telefone;
            const loja_colaborador = usuario.loja_colaborador; // A loja do colaborador (classe)

            // Debug: verificar valores de cliente_nome e cliente_telefone
            console.log(`🎉 Enviando mensagem para ${cliente_nome}, Telefone: ${cliente_telefone}, Loja: ${loja_colaborador}`);

            // Cria a mensagem de aniversário para o usuário
            //const mensagemAniversario = `🎉 Parabéns, ${cliente_nome}! 🎂 Desejamos um dia maravilhoso e cheio de alegrias! 🎈🎁`;
//const mensagemAniversario = `🎉 Parabéns, ${cliente_nome}! 🎂 Em nome da família Terel, desejamos a você um dia repleto de felicidade, amor e momentos inesquecíveis. Que este novo ano de vida seja ainda mais próspero e cheio de realizações! 🎈🎁 Que seus sonhos se tornem realidade e que você continue brilhando como sempre! 💖`;

  const mensagensAniversario = [
  `🎉 Feliz aniversário, ${cliente_nome}! 🥳 Que seu dia seja iluminado com muito amor, paz e felicidade! A família Terel deseja um ano incrível para você! 🎂🎈✨`,

  `🎊 Parabéns, ${cliente_nome}! 🎁 Hoje é o seu dia especial, e queremos celebrar com você! Que esta nova fase da sua vida traga ainda mais alegrias, saúde e sucesso! 🎂💖`,

  `🎂 Feliz aniversário, ${cliente_nome}! 🎈 Esperamos que seu dia seja repleto de momentos inesquecíveis e que o novo ciclo que se inicia traga tudo de melhor! Conte sempre com a gente! 🎊🥳`,

  `🥳 Hoje é dia de festa, ${cliente_nome}! 🎂 Parabéns por mais um ano de vida! Que essa data marque o início de muitas conquistas e realizações. A equipe Terel deseja tudo de melhor para você! 🎁🎈`,

  `🎈 Parabéns, ${cliente_nome}! 🎉 Que seu dia seja especial, cheio de alegria e boas energias! A equipe Terel deseja muita felicidade e sucesso nesta nova etapa! 🎂💖`,

  `🎁 Parabéns pelo seu dia, ${cliente_nome}! 🥂 Que este novo ano de vida seja repleto de conquistas, momentos felizes e muita saúde. Aproveite o seu dia ao máximo! 🎉✨`,

  `🎊 Feliz aniversário, ${cliente_nome}! 🎂 Hoje é um dia especial, e queremos celebrar com você. Que sua jornada seja sempre abençoada com felicidade, amor e sucesso! 💖🎈`,

  `🎉 Viva, ${cliente_nome}! Hoje é o seu dia! 🎂 Que essa nova idade venha acompanhada de muitas realizações e sonhos concretizados. Aproveite muito o seu dia! 🥳🎁`,

  `🎂 Parabéns, ${cliente_nome}! 🎉 Que essa data traga muita alegria, amor e esperança para sua vida. A família Terel deseja a você um ano cheio de momentos especiais! 🎊💖`,

  `🥳 Feliz aniversário, ${cliente_nome}! 🎈 Desejamos que você tenha um dia repleto de amor e felicidade, cercado por quem te faz bem! Que sua nova idade traga ainda mais sucesso! 🎂🎁`,

  `🎉 Hoje é um dia especial! Parabéns, ${cliente_nome}! 🎂 Que você continue conquistando seus sonhos e espalhando alegria por onde passa. A equipe Terel celebra com você! 🎈💖`,

  `🎊 Parabéns, ${cliente_nome}! 🎉 Que seu novo ano de vida seja repleto de momentos inesquecíveis, muitas alegrias e muito sucesso. Estamos felizes por comemorar com você! 🎂🎁`
];

// Para escolher uma mensagem aleatória:
const mensagemAniversario = mensagensAniversario[Math.floor(Math.random() * mensagensAniversario.length)];

                    
          // Formata o número de telefone no formato do WhatsApp
            const numeroWhatsApp = `${cliente_telefone.replace(/\D/g, '')}@c.us`;

            // Verifica se a função client.sendMessage está disponível
            if (!client || !client.sendMessage) {
                console.error('❌ Erro: client.sendMessage não está definido. Verifique a conexão do bot.');
                return;
            }

            try {
                // Envia a mensagem de aniversário para o usuário
                await client.sendMessage(numeroWhatsApp, mensagemAniversario);
                console.log(`🎉 Mensagem de aniversário enviada para ${cliente_nome} no número ${cliente_telefone}`);
            } catch (error) {
                console.error(`❌ Erro ao enviar mensagem para ${cliente_nome}: ${error.message || error}`);
            }

            // Envia a mensagem para o WhatsApp da Cheve, com o nome, telefone e loja do colaborador
            const mensagemCheve = `🎉 Olá Excelente Boss! 🎂 Hoje temos uma colaboradora fazendo aniversário! 🎈\n\n👤 Nome: ${cliente_nome}\n📞 Telefone: ${cliente_telefone}\n🏬 Loja: ${loja_colaborador}\n\nVamos celebrar! 🎉🎁`;

            // Número de telefone da Cheve
            const numeroCheve = '5511958261897@c.us';  // Número da Cheve

            try {
                // Envia a mensagem para o WhatsApp da Cheve
                await client.sendMessage(numeroCheve, mensagemCheve);
                console.log(`📩 Mensagem enviada para o WhatsApp da Cheve sobre o aniversário de ${cliente_nome}`);
            } catch (error) {
                console.error(`❌ Erro ao enviar mensagem para a Cheve: ${error.message || error}`);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao buscar aniversariantes:', error.message || error);
    }
}

// Executa imediatamente e depois a cada 2 minutos
setInterval(enviarFelizAniversario, 10 * 60 * 1000);
enviarFelizAniversario();
