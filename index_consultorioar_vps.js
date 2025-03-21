const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const axios = require('axios');

const fs = require('fs');
const rimraf = require('rimraf');
const express = require('express');
const { exec } = require('child_process');
const puppeteer = require('puppeteer-core');
const app = express();
const PORT = 3005;
const qrCodeDir = '/var/www/html/bot4';
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
  authStrategy: new LocalAuth({ clientId: 'bot4' }),
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
  enviarLembretes(client)
  enviarFelizAniversario(client)
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
// Executa a função a cada 5 minuto para garantir precisão
//setInterval(enviarLembretes, 5 * 60 * 1000);



//});

//client.initialize();

// Função para criar delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// Variáveis para armazenar os dados do cliente e do agendamento
//let cliente_nome = '';
//let data_agendamento = '';
//let horario_agendamento = '';
//let servico_id = '';


// Manipulação de mensagens
client.on('message', async msg => {
    const cliente_telefone = msg.from.split('@')[0];

    // Resposta ao menu inicial
    if (/^(menu|Menu|dia|tarde|noite|bom dia|oi|Oi|Voltar|voltar|Olá|olá|ola|Ola)$/i.test(msg.body) && msg.from.endsWith('@c.us')) {
        const chat = await msg.getChat();
        const contact = await msg.getContact();
        const name = contact.pushname || "Cliente";

       
        await delay(2000);
        await chat.sendStateTyping();
        await delay(2000);

        await client.sendMessage(
            msg.from,
            `Olá, *${name.split(" ")[0]}*! 👋 Eu sou o assistente virtual do *Consultório A.R*. Como posso ajudá-lo(a) hoje? Escolha uma das opções abaixo:\n\n` +
            `1️⃣ - Serviços \n` +
            `2️⃣ - Agendar horário\n` +
            `3️⃣ - Promoções da semana\n` +
            `4️⃣ - Localização\n` +
            `5️⃣ - Outras dúvidas\n` +
            `6️⃣ - Consultar agendamento`
        );
    }

    // Resposta para a opção "Serviços e Preços"
    if (msg.body === '1' && msg.from.endsWith('@c.us')) {
        const chat = await msg.getChat();
        await delay(2000);
        await chat.sendStateTyping();
        await delay(2000);


        let servicosDisponiveis = {};
        try {
            const response = await axios.get('https://consultorioar.antoniooliveira.shop/consultar-servicos_bot.php');
            servicosDisponiveis = response.data.servicos;
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            await client.sendMessage(msg.from, '❌ Erro ao consultar serviços. Tente novamente mais tarde.');
            return;
        }
       
        const listaServicos = Object.entries(servicosDisponiveis)
            .map(([codigo, { nome }]) => ` ${nome}`)
            .join('\n');
       
        await client.sendMessage(
            msg.from,
            `👨‍⚕️ *Serviços* 🦷🪥👩‍⚕️\n\n` +
            `📝\n${listaServicos}\n` +
            `Digite *2* para agendar seu horário! `
        );
    }

   

    // Resposta para "Localização"
    if (msg.body === '4' && msg.from.endsWith('@c.us')) {

        const chat = await msg.getChat();
        await delay(2000);
        await chat.sendStateTyping();
        await delay(2000);


        await client.sendMessage(
            msg.from,
            `📍 *Localização do Consultório A.R* 📍\n\n` +
            `Endereço: R.Altino M da Vitório,530, Grajaú, CEP:04830-208 Centro\n` +
            `Cidade: São Paulo - SP\n\n` +
            `Estamos ansiosos para sua visita! 😊`
        );
    }


    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
 // Resposta para "Promoções da Semana"
 if (msg.body === '3' && msg.from.endsWith('@c.us')) {

    const chat = await msg.getChat();
    await delay(2000);
    await chat.sendStateTyping();
    await delay(2000);


 // Consultar os serviços disponíveis
 let servicosDisponiveis = {};
 try {
     const response = await axios.get('https://consultorioar.antoniooliveira.shop/consultar-servicos_bot_p.php');
     servicosDisponiveis = response.data.servicos;
 } catch (error) {
     console.error('Erro ao carregar serviços:', error);
     await client.sendMessage(msg.from, '❌ Erro ao consultar serviços. Tente novamente mais tarde.');
     return;
 }

 const listaServicos = Object.entries(servicosDisponiveis)
     .map(([codigo, { nome }]) => ` ${nome}`)
     .join('\n');


     await client.sendMessage(
        msg.from,
        `🎉 *Promoções da Semana* 🎉\n\n` +
        `📝\n${listaServicos}\n` +
        `Aproveite essas ofertas incríveis! Válidas até sábado. 💅\n\n` +  // Adicionei o '+' aqui
        `Digite *2* para agendar seu horário!\n`
    );
    
}

// Verifica se o cliente digitou '6' para iniciar a consulta


// Função assíncrona para tratar o código do agendamento
async function handleAgendamento(msg) {
    
    const codigoAgendamento = msg.body;

    try {
        // Envia a requisição POST para consultar o código do agendamento
        const response = await axios.post('https://consultorioar.antoniooliveira.shop/consulta_bot_codigo.php', {
            protocolo: codigoAgendamento
        });
        const chat = await msg.getChat();
        await delay(2000);
        await chat.sendStateTyping();
        await delay(2000);
        // Se o agendamento for encontrado, envia os detalhes
        if (response.data.encontrado) {
            const { nome, telefone, servico, data, horario } = response.data.dados;
            await client.sendMessage(msg.from, 
                `🔍 *Detalhes do Agendamento*\n\n` +
                `📋 Código: ${codigoAgendamento}\n` +
                `👤 Nome: ${nome}\n` +
                `📞 Telefone: ${telefone}\n` +
                `💇‍♀️ Serviço: ${servico}\n` +
                `📅 Data: ${data}\n` +
                `⏰ Horário: ${horario}\n\n` +
                `📌 Se precisar de algo, digite *menu* para ver as opções.`
            );
            
        } else {
            // Caso o agendamento não seja encontrado
            await client.sendMessage(msg.from, `❌ Não foi possível localizar o agendamento com o código informado.`);
        }
    } catch (error) {
        // Se ocorrer um erro ao fazer a requisição
        console.error('Erro ao consultar o agendamento:', error);
        await client.sendMessage(msg.from, `❌ Houve um problema ao consultar o agendamento. Tente novamente mais tarde.`);
    }
}

if (msg.body === '6' && msg.from.endsWith('@c.us')) {
    const chat = await msg.getChat();
    await delay(2000);
    await chat.sendStateTyping();
    await delay(2000);

    client.sendMessage(msg.from, '📅 Por favor, digite o código do agendamento (protocolo) para consultar.');

    // Aguarda apenas a próxima mensagem do usuário
    const listener = async (newMsg) => {
        if (newMsg.from === msg.from) {
            if (newMsg.body.match(/^\d+$/)) {
                client.removeListener('message', listener); // Remove o listener para evitar múltiplas execuções
                handleAgendamento(newMsg);
            } else {
                client.sendMessage(msg.from, '❌ Por favor, insira um código de agendamento válido.');
            }
        }
    };

    client.on('message', listener);
}


    // Resposta para "Outras Dúvidas"
    if (msg.body === '5' && msg.from.endsWith('@c.us')) {

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

     // Verifica se o usuário quer editar algum dado
     if (msg.body.startsWith('editar') && msg.from.endsWith('@c.us')) {
        const editField = msg.body.split(' ')[1]; // Exemplo: 'editar nome'
    
        if (editField === 'nome') {
            // Resetando as variáveis
            cliente_nome = '';
            await client.sendMessage(msg.from, `📝 Por favor, envie novamente seu nome completo.`);
            cliente_nome = msg.body;
        } else if (editField === 'serviço') {
            // Resetando as variáveis
            servico_id = '';
         
            await client.sendMessage(msg.from, `📝 Por favor, envie o serviço desejado novamente.`);
            servico_id = msg.body;
        } else if (editField === 'data') {
            // Resetando as variáveis
            data_agendamento = '';
            await client.sendMessage(msg.from, `📝 Por favor, envie a data desejada novamente no formato DD/MM/AAAA.`);
            data_agendamento = msg.body;
            
        } else if (editField === 'horário') {
            // Resetando as variáveis
            horario_agendamento = '';
            await client.sendMessage(msg.from, `📝 Por favor, envie o horário desejado novamente no formato HH:mm.`);
            horario_agendamento = msg.body;
        } else {
            await client.sendMessage(msg.from, `❌ Não entendi. Para editar algum dado, envie: 'editar nome', 'editar serviço', 'editar data' ou 'editar horário'.`);
        }
    }
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
//menu 2
if (msg.body === '2' && msg.from.endsWith('@c.us')) {
    const chat = await msg.getChat();
    await delay(2000);
    await chat.sendStateTyping();
    await delay(2000);

    let cliente_nome = '';
    let servico_id = '';
    let data_agendamento = '';
    let horario_agendamento = '';
    let protocolo = '';
    let confirmacao = false;
    let cliente_telefone = msg.from.split('@')[0];

    async function solicitarCampo(campo, mensagemValidacao, regex = null, mensagemConfirmacao = '') {
        let tentativas = 0;
        let campoValido = false;

        while (!campoValido) {
            if (tentativas >= 3) {
                await client.sendMessage(msg.from, '⚠️ Muitas tentativas inválidas. Retornando ao menu principal.');
                return null;
            }

            if (!campo || (regex && !regex.test(campo))) {
                if (campo && regex && !regex.test(campo)) {
                    await client.sendMessage(msg.from, mensagemValidacao);
                    tentativas++;
                }
                const resposta = await esperarMensagem(msg.from);

                if (resposta.toLowerCase() === 'menu') {
                    await client.sendMessage(msg.from, '🔙 Retornando ao menu principal.');
                    return null;
                }

                campo = resposta;
            }

            if (regex && !regex.test(campo)) {
                await client.sendMessage(msg.from, mensagemValidacao);
                tentativas++;
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

    async function verificarDisponibilidade(servico_id, data_agendamento) {
        const [dia, mes, ano] = data_agendamento.split('/');
        const dataFormatada = `${ano}-${mes}-${dia}`;
        try {
            const response = await axios.post('https://consultorioar.antoniooliveira.shop/verificar-horario.php', {
                servico_id: servico_id,
                data_agendamento: dataFormatada
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            return response.data.horarios_disponiveis || [];
        } catch (error) {
            await client.sendMessage(msg.from, '❌ Erro ao verificar horários disponíveis. Tente novamente.');
            return [];
        }
    }

    let servicosDisponiveis = {};
    try {
        const response = await axios.get('https://consultorioar.antoniooliveira.shop/consultar-servicos_bot.php');
        servicosDisponiveis = response.data.servicos;
    } catch (error) {
        await client.sendMessage(msg.from, '❌ Erro ao consultar serviços. Tente novamente mais tarde.');
        return;
    }

    const listaServicos = Object.entries(servicosDisponiveis)
        .map(([codigo, { nome }]) => `${codigo} ${nome}`)
        .join('\n');

    await client.sendMessage(
        msg.from,
        `🌟 *Agendamento de Horário* 🌟\n\n` +
        `Digite *Nome Completo:*\n\n` +
        `Escolha *Código do Serviço:* da lista abaixo:\n\n${listaServicos}\n\n` +
        `Digite a *Data:*  (Formato: 📅 DD/MM/AAAA)\n\n` +
        `Digite *Menu* para retornar ao menu principal.`
    );

    // Solicita o nome (limita erros)
cliente_nome = await solicitarCampo(
    null,
    '❌ Nome inválido. Por favor, envie seu nome completo sem números.',
    /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/,
    'Nome recebido'
);
if (!cliente_nome) return;
await client.sendMessage(msg.from, '✅ Nome confirmado! Agora, informe o código do serviço.');

// Solicita o serviço
servico_id = await solicitarCampo(
    null,
    `❌ Código inválido. Escolha um código válido:\n${listaServicos}`,
    /^[0-9]+$/,
    'Serviço escolhido'
);
if (!servico_id) return;
await client.sendMessage(msg.from, '✅ Serviço confirmado! Agora, informe a data do agendamento.*Data:*  (Formato: 📅 DD/MM/AAAA)');

// Solicita a data
data_agendamento = await solicitarCampo(
    null,
    '❌ Data inválida! Envie no formato DD/MM/AAAA.',
    /^\d{2}\/\d{2}\/\d{4}$/,
    'Data recebida'
);
if (!data_agendamento) return;
await client.sendMessage(msg.from, '✅ Data confirmada! Agora, veja os horários disponíveis.');

const horariosDisponiveis = await verificarDisponibilidade(servico_id, data_agendamento);
if (horariosDisponiveis.length > 0) {
    let mensagem = `✅ *Horários disponíveis para ${data_agendamento}:*\n\n`;
    horariosDisponiveis.forEach(horario => {
        mensagem += `🕒 ${horario}\n\n`;
    });
    mensagem += `*Escolha o seu Horário:* (Formato: ⏰ HH:mm)\n\n`;
    await client.sendMessage(msg.from, mensagem);
} else {
    await client.sendMessage(msg.from, `❌ *Nenhum horário disponível para ${data_agendamento}.*`);
    return;
}

// Solicita o horário
horario_agendamento = await solicitarCampo(
    null,
    '❌ Horário inválido! Envie no formato HH:mm.',
    /^([01]\d|2[0-3]):([0-5]\d)$/,
    'Horário recebido'
);
if (!horario_agendamento) return;

await client.sendMessage(
    msg.from,
    `📝 *Confirme as informações:*\n\n` +
    `👤 *Nome:* ${cliente_nome}\n` +
    `💼 *Serviço:* ${servicosDisponiveis[servico_id].nome}\n` +
    `📅 *Data:* ${data_agendamento}\n` +
    `⏰ *Horário:* ${horario_agendamento}\n\n` +
    `✅ *Digite "Sim"* para confirmar\n❌ *Digite "Cancelar"* para cancelar e voltar ao menu principal\n📜 *Digite "Menu"* para retornar ao menu principal.`
);

// Aguardar a resposta do usuário
const resposta = await esperarMensagem(msg.from);

// Verifique o valor exato da resposta
console.log(`Resposta recebida: "${resposta}"`); // Adicionando log para depuração

// Verificar se a resposta foi "sim"
if (resposta.toLowerCase().trim() === 'sim') {
    confirmacao = true;
    console.log("Confirmação recebida!");
} else if (resposta.toLowerCase().trim() === 'cancelar') {
    await client.sendMessage(msg.from, '❌ Agendamento cancelado. Retornando ao menu principal.');
    return;
} else if (resposta.toLowerCase().trim() === 'menu') {
    await client.sendMessage(msg.from, '📜 Retornando ao menu principal...');
    return;
} else {
    await client.sendMessage(msg.from, '❌ Resposta inválida. Por favor, digite "Sim" para confirmar, "Cancelar" para cancelar ou "Menu" para retornar ao menu principal.');
    return;
}

    try {
        const protocoloResponse = await axios.post('https://consultorioar.antoniooliveira.shop/gerar_protocolo.php', {
            cliente_nome,
            cliente_telefone,
            servico_id,
            data_agendamento,
            horario_agendamento: `${horario_agendamento}:00`
        });

        protocolo = protocoloResponse.data.protocolo;

       
        if (protocolo) {
            await client.sendMessage(
                msg.from,
                `✅ *Agendamento Confirmado!*\n` +
                `📜 *Protocolo:* ${protocolo}\n` +
                `👤 *Nome:* ${cliente_nome}\n` +
                `💼 *Serviço:* ${servicosDisponiveis[servico_id].nome}\n` +
                `📅 *Data:* ${data_agendamento}\n` +
                `⏰ *Horário:* ${horario_agendamento}\n\n` +
                `🚪 *Estamos te aguardando!*\n` +
                `👋 *Até mais!*`
            );
            await client.sendMessage(msg.from, '✅ Horário confirmado! Agendamento finalizado.');
        

        } else {
            await client.sendMessage(msg.from, '❌ Erro ao confirmar o agendamento. Tente novamente.');
        }
    } catch (error) {
        await client.sendMessage(msg.from, '❌ Erro ao confirmar o agendamento. Tente novamente.');
    }
}





})
const agendamentosNotificados = new Set();
const INTERVALO_EXECUCAO = 10 * 60 * 1000; // 10 minutos em milissegundos

async function enviarLembretes(client) {
    try {
        console.log('🔄 Verificando agendamentos...');
        const response = await axios.get('https://consultorioar.antoniooliveira.shop/consultar-agendamentos.php');
        console.log('🔍 Resposta da API:', response.data);

        if (!response.data || !response.data.agendamentos || response.data.agendamentos.length === 0) {
            console.log('⚠️ Nenhum agendamento encontrado.');
            return;
        }

        const agendamentos = response.data.agendamentos;
        const horaAtual = new Date();
        const horaAtualEmMinutos = horaAtual.getHours() * 60 + horaAtual.getMinutes();
        console.log(`⏰ Hora atual: ${horaAtualEmMinutos} minutos`);

        for (const agendamento of agendamentos) {
            const { cliente_telefone, cliente_nome, servico, data_agendamento, horario_agendamento } = agendamento;

            if (!cliente_telefone || !cliente_nome || !servico || !data_agendamento || !horario_agendamento) {
                console.log(`⚠️ Dados incompletos para ${cliente_telefone}.`);
                continue;
            }

            const dataObj = new Date(`${data_agendamento}T${horario_agendamento}`);
            const dataFormatada = dataObj.toLocaleDateString('pt-BR');
            const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const minutoAgendamento = dataObj.getHours() * 60 + dataObj.getMinutes();
            const chaveConfirmacaoManha = `${cliente_telefone}-${dataFormatada}-confirmacao-manha`;
            const chaveConfirmacaoAntes = `${cliente_telefone}-${dataFormatada}-confirmacao-antes`;

            console.log(`📅 Agendamento: ${cliente_nome} às ${horaFormatada} (${minutoAgendamento} min)`);

            // 🔹 Primeiro lembrete de confirmação: Antes das 10h
            const horarioLimiteConfirmacao = 10 * 60; // 10:00 em minutos
            if (!agendamentosNotificados.has(chaveConfirmacaoManha) && horaAtualEmMinutos < horarioLimiteConfirmacao) {
                console.log(`📢 Enviando mensagem de confirmação da manhã para ${cliente_telefone}`);

                const mensagemConfirmacao = `👋 Olá, *${cliente_nome}*!\nSeu agendamento está marcado para hoje às ${horaFormatada}.\n📅 Data: ${dataFormatada}\n💇 Serviço: ${servico}\n\nVocê pode confirmar sua presença? ✅\n\nAguardamos seu retorno! 😊`;

                try {
                    const numeroWhatsApp = `${cliente_telefone}@c.us`;
                    await client.sendMessage(numeroWhatsApp, mensagemConfirmacao);
                    console.log(`✅ Confirmação da manhã enviada para ${cliente_telefone}`);
                    agendamentosNotificados.add(chaveConfirmacaoManha);
                } catch (error) {
                    console.error(`❌ Erro ao enviar confirmação para ${cliente_telefone}:`, error);
                }
            }

            // 🔹 Segundo lembrete de confirmação: 40 minutos antes do horário agendado
            const minutosAntes = 40;
            const horarioEnvioConfirmacao = minutoAgendamento - minutosAntes;
            if (!agendamentosNotificados.has(chaveConfirmacaoAntes) && horaAtualEmMinutos >= horarioEnvioConfirmacao && horaAtualEmMinutos < minutoAgendamento) {
                console.log(`📢 Enviando segunda confirmação para ${cliente_telefone}`);

                const mensagemConfirmacaoAntes = `🔔 Olá, *${cliente_nome}*!\nLembrete do seu agendamento:\n\n📅 Data: ${dataFormatada}\n🕒 Horário: ${horaFormatada}\n💇 Serviço: ${servico}\n\nPodemos confirmar sua presença? 😊`;

                try {
                    const numeroWhatsApp = `${cliente_telefone}@c.us`;
                    await client.sendMessage(numeroWhatsApp, mensagemConfirmacaoAntes);
                    console.log(`✅ Segunda confirmação enviada para ${cliente_telefone}`);
                    agendamentosNotificados.add(chaveConfirmacaoAntes);
                } catch (error) {
                    console.error(`❌ Erro ao enviar segunda confirmação para ${cliente_telefone}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('❌ Erro ao buscar agendamentos:', error.message || error);
    }
}

// 🚀 Rodando o script a cada 10 minutos
setInterval(() => {
    enviarLembretes(client);
}, INTERVALO_EXECUCAO);

// Executa uma vez ao iniciar
enviarLembretes(client);

const agendamentosNotificadosAniversario = new Set();

async function enviarFelizAniversario(client) {
    try {
        // Faz a requisição para pegar os aniversariantes
        const response = await axios.get('https://consultorioar.antoniooliveira.shop/consultar-data_nascimento_bot.php');

        // Verifica se há aniversariantes
        if (!response || !response.data || !Array.isArray(response.data.usuarios) || response.data.usuarios.length === 0) {
            console.log('⚠️ Nenhum aniversário encontrado hoje.');
            return;
        }

        const usuarios = response.data.usuarios;

        // Envia mensagem para cada usuário e também para o WhatsApp da Cheve
        for (const usuario of usuarios) {
            // Extrair apenas o nome e o telefone do cliente
            const cliente_nome = usuario.cliente_nome ? usuario.cliente_nome.trim() : "Anônimo"; // Tratar espaços extras no nome
            const cliente_telefone = usuario.cliente_telefone;

            // Debug: verificar valores de cliente_nome e cliente_telefone
            console.log(`🎉 Enviando mensagem para ${cliente_nome}, Telefone: ${cliente_telefone}`);

            // Cria a mensagem de aniversário para o usuário
            const mensagensAniversario = [
                `🎉 Feliz aniversário, *${cliente_nome}*! 🥳 Que seu dia seja iluminado com muito amor, paz e felicidade! Desejamos um ano incrível para você! 🎂🎈✨`,
                `🎊 Parabéns, *${cliente_nome}*! 🎁 Hoje é o seu dia especial, e queremos celebrar com você! Que esta nova fase da sua vida traga ainda mais alegrias, saúde e sucesso! 🎂💖`,
                `🎂 Feliz aniversário, *${cliente_nome}*! 🎈 Esperamos que seu dia seja repleto de momentos inesquecíveis e que o novo ciclo que se inicia traga tudo de melhor! Conte sempre com a gente! 🎊🥳`,
                `🥳 Hoje é dia de festa, *${cliente_nome}*! 🎂 Parabéns por mais um ano de vida! Que essa data marque o início de muitas conquistas e realizações. Desejamos tudo de melhor para você! 🎁🎈`,
                `🎈 Parabéns, *${cliente_nome}*! 🎉 Que seu dia seja especial, cheio de alegria e boas energias! Desejamos muita felicidade e sucesso nesta nova etapa! 🎂💖`,
                `🎁 Parabéns pelo seu dia, *${cliente_nome}*! 🥂 Que este novo ano de vida seja repleto de conquistas, momentos felizes e muita saúde. Aproveite o seu dia ao máximo! 🎉✨`,
                `🎊 Feliz aniversário, *${cliente_nome}*! 🎂 Hoje é um dia especial, e queremos celebrar com você. Que sua jornada seja sempre abençoada com felicidade, amor e sucesso! 💖🎈`,
                `🎉 Viva, *${cliente_nome}*! Hoje é o seu dia! 🎂 Que essa nova idade venha acompanhada de muitas realizações e sonhos concretizados. Aproveite muito o seu dia! 🥳🎁`,
                `🎂 Parabéns, *${cliente_nome}*! 🎉 Que essa data traga muita alegria, amor e esperança para sua vida. Desejamos a você um ano cheio de momentos especiais! 🎊💖`,
                `🥳 Feliz aniversário, *${cliente_nome}*! 🎈 Desejamos que você tenha um dia repleto de amor e felicidade, cercado por quem te faz bem! Que sua nova idade traga ainda mais sucesso! 🎂🎁`,
                `🎉 Hoje é um dia especial! Parabéns, *${cliente_nome}*! 🎂 Que você continue conquistando seus sonhos e espalhando alegria por onde passa. Celebramos com você! 🎈💖`,
                `🎊 Parabéns, *${cliente_nome}*! 🎉 Que seu novo ano de vida seja repleto de momentos inesquecíveis, muitas alegrias e muito sucesso. Estamos felizes por comemorar com você! 🎂🎁`
            ];
            

            // Para escolher uma mensagem aleatória
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

            // Envia a mensagem para o WhatsApp da Cheve, com o nome e telefone do cliente
            const mensagemCheve = `🎉 Olá! Hoje temos um cliente fazendo aniversário! 🎈\n\n👤 Nome: ${cliente_nome}\n📞 Telefone: ${cliente_telefone}\n\nVamos celebrar! 🎉🎁`;

            // Número de telefone da Cheve
            const numeroCheve = '5511962689478@c.us';  // Número da Cheve

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

// Executa imediatamente e depois a cada 10 minutos
//setInterval(enviarFelizAniversario(client), 10 * 60 * 1000);
// Executa imediatamente e depois a cada 10 minutos

// Executa depois a cada 24 horas
setInterval(enviarFelizAniversario, 10 * 60 * 60 * 1000);
enviarFelizAniversario();
