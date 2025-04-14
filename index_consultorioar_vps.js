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

const BASE_URL = 'https://consultorioar.antoniooliveira.shop';
const NOME_CLIENTE='Consultório AR';
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

    async function mostrarMenuPrincipal(msg) {
        const chat = await msg.getChat();
        const contact = await msg.getContact();
        const name = contact.pushname || "Cliente";
    
        await delay(2000);
        await chat.sendStateTyping();
        await delay(2000);
    
        await client.sendMessage(
            msg.from,
            `Olá, *${name.split(" ")[0]}*! 👋 Eu sou o assistente virtual do *${NOME_CLIENTE}*. Como posso ajudá-lo(a) hoje? Escolha uma das opções abaixo:\n\n` +
            `1️⃣ - Serviços \n` +
            `2️⃣ - Agendar horário\n` +
            `3️⃣ - Promoções da semana\n` +
            `4️⃣ - Localização\n` +
            `5️⃣ - Outras dúvidas\n` +
            `6️⃣ - Consultar agendamento`
        );
    }
    // Resposta ao menu inicial
if (/^(menu|Menu|tarde|noite|bom dia|oi|Oi|Voltar|voltar|Olá|olá|cancelar|Cancelar|ola|Ola)$/i.test(msg.body) && msg.from.endsWith('@c.us')) {
    await mostrarMenuPrincipal(msg);
}

    // Resposta para a opção "Serviços e Preços"
    if (msg.body === '1' && msg.from.endsWith('@c.us')) {
        const chat = await msg.getChat();
        await delay(2000);
        await chat.sendStateTyping();
        await delay(2000);


        let servicosDisponiveis = {};
        try {
            const response = await axios.get(`${BASE_URL}/consultar-servicos_bot.php`);
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
            `📍 *Localização do ${NOME_CLIENTE}* 📍\n\n` +
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
     const response = await axios.get(`${BASE_URL}/consultar-servicos_bot_p.php`);
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
        const response = await axios.post(`${BASE_URL}/consulta_bot_codigo.php`, {
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
                `📋 Código: *${codigoAgendamento}*\n` +
                `👤 Nome: *${nome}*\n` +
                `📞 Telefone: *${telefone}*\n` +
                `🦷 Serviço: *${servico}*\n` +
                `📅 Data: *${data}*\n` +
                `⏰ Horário: *${horario}*\n\n` +
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
    let confirmacao = false;
    let cliente_telefone = msg.from.split('@')[0];
    let id_dentista = '';

    

    async function solicitarCampo(campo, mensagemValidacao, regex = null, mensagemConfirmacao = '') {
        let tentativas = 0;
        let campoValido = false;

        while (!campoValido) {
            if (tentativas >= 5) {
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

    async function verificarDisponibilidade(id_dentista, data_agendamento) {
        if (!data_agendamento || typeof data_agendamento !== 'string') {
            console.error('❌ data_agendamento inválido:', data_agendamento);
            return [];
        }
    
        const [dia, mes, ano] = data_agendamento.split('/');
        const dataFormatada = `${ano}-${mes}-${dia}`;
        try {
            const response = await axios.post(`${BASE_URL}/verificar-horario.php`, {
                id_dentista: id_dentista,
                data_agendamento: dataFormatada
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            return response.data.horarios_disponiveis || [];
        } catch (error) {
            console.error('❌ Erro ao verificar horários:', error);
            await client.sendMessage(msg.from, '❌ Erro ao verificar horários disponíveis. Tente novamente.');
            return [];
        }
    }
    

    let servicosDisponiveis = {};
    try {
        const response = await axios.get(`${BASE_URL}/consultar-servicos_bot.php`);
        servicosDisponiveis = response.data.servicos;
    } catch (error) {
        await client.sendMessage(msg.from, '❌ Erro ao consultar serviços. Tente novamente mais tarde.');
        return;
    }

    const listaServicos = Object.entries(servicosDisponiveis)
        .map(([codigo, { id_dentista, nome, nome_dentista}]) =>
            `*${codigo}* ${nome} (Dr(a). ${nome_dentista}) `
        )
        .join('\n');

        const contact = await msg.getContact();
        const nomeAuto = contact.name || contact.pushname || "Cliente";
        
        // Envia a mensagem com a sugestão do nome detectado
        await client.sendMessage(
            msg.from,
            `🌟 *Agendamento de Horário* 🌟\n\n` +
            `Detectamos seu nome como: *${nomeAuto}*\n\n` +
            `Se estiver correto, digite *SIM*.\n` +
            `Ou envie seu *Nome Completo:* (Por favor, sem números)\n\n` +
            `Digite *Menu* para retornar ao menu principal.`
        );
        
        // Solicita o nome ou confirmação
         cliente_nome = await solicitarCampo(
            null,
            '❌ Nome inválido. Por favor, envie seu nome completo sem números ou digite SIM para confirmar o nome sugerido.',
            /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$|^sim$/i,
            'Nome ou confirmação recebido'
        );
        if (!cliente_nome) return;
        
        // Se digitou "sim", usa o nome detectado
        if (/^sim$/i.test(cliente_nome)) {
            cliente_nome = nomeAuto;
        }
        
        // Confirma o nome e avança para os serviços
        await client.sendMessage(
            msg.from,
            `✅ Nome confirmado como: *${cliente_nome}*.\n\nAgora, escolha o serviço.\n\nEscolha um código de serviço:\n${listaServicos}`
        );
        
do {
    // Solicita o serviço
    let entrada = await solicitarCampo(
        null,
        `❌ Código inválido. Escolha um código válido:\n${listaServicos}`,
        /^[0-9]+$/,
        'Serviço escolhido'
    );

    // Remove zeros à esquerda e garante que é um número
    let codigoNumerico = parseInt(entrada, 10);

    // Se for um número válido com apenas um dígito, adiciona zero à esquerda
    servico_id = codigoNumerico < 10 ? `0${codigoNumerico}` : String(codigoNumerico);

    // Verifica se o serviço existe com esse código formatado
    if (!servicosDisponiveis[servico_id]) {
        await client.sendMessage(msg.from, `❌ O código informado não corresponde a nenhum serviço disponível. Escolha novamente:\n${listaServicos}`);
    }

} while (!servicosDisponiveis[servico_id]);
// Repete até que o serviço escolhido seja válido

// Captura o ID do dentista
 id_dentista = servicosDisponiveis[servico_id].id_dentista;
// Pergunta se o usuário quer agendar para hoje ou não
await client.sendMessage(msg.from, '📅 Você deseja agendar para hoje? (Responda com "Sim" ou "Não")');

let resposta = await solicitarCampo(
    null,
    '❌ Responda apenas com "Sim" ou "Não".',
    /^(sim|nao|não)$/i,
    'Resposta recebida'
);

if (!resposta) return;

let hoje = new Date();
let mes = String(hoje.getMonth() + 1).padStart(2, '0');  // Pega o mês atual (com 2 dígitos)
let ano = hoje.getFullYear();  // Pega o ano atual
let dataAtual = `${hoje.getDate()}/${mes}/${ano}`;  // Preenche com o dia atual, mês e ano

// Se o cliente escolher "sim", usa a data atual
if (resposta.toLowerCase() === 'sim') {
    data_agendamento = dataAtual;
    await client.sendMessage(msg.from, `📆 Agendando para hoje: ${data_agendamento}`);
} else {
    // Se o cliente escolher "não", perguntar se deseja digitar apenas o dia
    await client.sendMessage(msg.from, '✅ Você deseja informar apenas o *dia* (por exemplo: 13) ou digitar a data completa no formato 04/11/2025? (Responda com "Dia" ou "Data Completa")');

    let escolhaData = await solicitarCampo(
        null,
        '❌ Resposta inválida! Responda apenas com "Dia" ou "Data Completa".',
        /^(dia|data completa)$/i,
        'Escolha recebida'
    );
    
    if (!escolhaData) return;

    // Se o cliente escolher "Dia", permitir apenas digitar o dia
    if (escolhaData.toLowerCase() === 'dia') {
        await client.sendMessage(msg.from, '✅ Envie o *dia* (ex: 13). Usaremos o mês e o ano atuais.');
        
        // Solicita apenas o dia
        let diaInformado = await solicitarCampo(
            null,
            '❌ Dia inválido! Envie apenas o dia (ex: 13).',
            /^\d{1,2}$/,
            'Dia recebido'
        );
        
        data_agendamento = `${String(diaInformado).padStart(2, '0')}/${mes}/${ano}`;

        // Verifica se é uma data futura ou atual
        let partes = data_agendamento.split('/');
        let dataDigitada = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
        let hojeSemHoras = new Date();
        hojeSemHoras.setHours(0, 0, 0, 0);
        
        if (dataDigitada < hojeSemHoras) {
            await client.sendMessage(msg.from, '❌ Não é permitido agendar para uma data retroativa. Tente novamente.');
            return;
        }
        
        await client.sendMessage(msg.from, `📆 Agendando para o dia: ${data_agendamento}`);
    } else if (escolhaData.toLowerCase() === 'data completa') {
        // Se o cliente escolher "Data Completa", permite digitar a data completa
        await client.sendMessage(msg.from, '✅ Envie a data completa no formato *DD/MM/AAAA* (ex: 04/11/2025).');

        let dataCompletaInformada = await solicitarCampo(
            null,
            '❌ Data inválida! Envie a data no formato *DD/MM/AAAA* (ex: 04/11/2025).',
            /^\d{2}\/\d{2}\/\d{4}$/,
            'Data recebida'
        );

        data_agendamento = dataCompletaInformada;

        let partes = data_agendamento.split('/');
        let dataDigitada = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
        let hojeSemHoras = new Date();
        hojeSemHoras.setHours(0, 0, 0, 0);
        
        if (dataDigitada < hojeSemHoras) {
            await client.sendMessage(msg.from, '❌ Não é permitido agendar para uma data retroativa. Tente novamente.');
            return;
        }
        
        await client.sendMessage(msg.from, `📆 Agendando para a data: ${data_agendamento}`);
        
    }
}
let continuarConsultas = true;
while (continuarConsultas) {
    await client.sendMessage(msg.from, '✅ Data confirmada! Agora, veja os horários disponíveis.');

    const horariosDisponiveis = await verificarDisponibilidade(id_dentista, data_agendamento);
    if (horariosDisponiveis.length > 0) {
        let mensagem = `✅ *Horários disponíveis para ${data_agendamento}:*\n\n`;
        horariosDisponiveis.forEach(horario => {
            mensagem += `🕒 ${horario}\n\n`;
        });
        mensagem += `*Escolha o seu Horário:* (Formato: ⏰ 10:00)\n\n`;
        mensagem += `❓ Para consultar outra data, digite "Nova Data".\n`;
        mensagem += `📅 Você também pode digitar apenas um *dia* (ex: 20) para buscar horários nesse dia do mês atual.`;

        await client.sendMessage(msg.from, mensagem);

        let entrada = await solicitarCampo(
            null,
            '❌ Entrada inválida! Envie no formato 10:00 ou "Nova Data".',
            /^([01]\d|2[0-3]):([0-5]\d)$|^[Nn]ova [Dd]ata$|^\d{1,2}$/,
            'Entrada recebida'
        );
        if (!entrada) return;

        if (/^[Nn]ova [Dd]ata$/.test(entrada)) {
            await client.sendMessage(msg.from, '📆 Digite a nova data desejada (Formato: 04/11/2025):');
            const nova_data = await solicitarCampo(
                null,
                '❌ Data inválida! Use o formato 04/11/2025.',
                /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,
                'Data recebida'
            );
            if (!nova_data) return;

            let partes = nova_data.split('/');
            let dataDigitada = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
            let hojeSemHoras = new Date();
            hojeSemHoras.setHours(0, 0, 0, 0);
            
            if (dataDigitada < hojeSemHoras) {
                await client.sendMessage(msg.from, '❌ Não é permitido agendar para uma data retroativa. Tente novamente.');
                continue;
            }
            

            data_agendamento = nova_data;
            continue;
        } else if (/^\d{1,2}$/.test(entrada)) {
            const hoje = new Date();
            const dia = entrada.padStart(2, '0');
            const mes = String(hoje.getMonth() + 1).padStart(2, '0');
            const ano = hoje.getFullYear();
            data_agendamento = `${dia}/${mes}/${ano}`;
            continue;
        }

        horario_agendamento = entrada;

        // Só sai do loop se o horário for válido
        if (horariosDisponiveis.includes(horario_agendamento)) {
            break;
        } else {
            await client.sendMessage(msg.from, '❌ Horário não disponível. Por favor, escolha um horário disponível.');
        }
    } else {
        await client.sendMessage(msg.from, '❌ Não há horários disponíveis para esta data. Digite "Nova Data", Use o formato 04/11/2025 para tentar outro dia.');
        const nova_data = await solicitarCampo(
            null,
            '❌ Data inválida! Use o formato 04/11/2025.',
            /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,
            'Data recebida'
        );
        if (!nova_data) return;
        data_agendamento = nova_data;
    }
}

// ⚠️ Agora o horário foi confirmado como válido, seguimos com a confirmação:
await client.sendMessage(msg.from, `📝 *Confirme as informações:*\n\n` +
    `👤 *Nome:* ${cliente_nome}\n` +
    `💼 *Serviço:* ${servicosDisponiveis[servico_id].nome}\n` +
    `📅 *Data:* ${data_agendamento}\n` +
    `⏰ *Horário:* ${horario_agendamento}\n\n` +
    `✅ *Digite "Sim"* para confirmar\n❌ *Digite "Cancelar"* para cancelar e voltar ao menu principal\n📜 *Digite "Menu"* para retornar ao menu principal.\n❓ Para consultar outra data, digite "Nova Data".`);

             resposta = await esperarMensagem(msg.from);

            if (resposta.toLowerCase().trim() === 'sim') {
                confirmacao = true;
                await client.sendMessage(msg.from, '✅ Agendamento confirmado! Obrigado.');

                try {
                    const protocoloResponse = await axios.post(`${BASE_URL}/gerar_protocolo.php`, {
                        cliente_nome,
                        cliente_telefone,
                        servico_id,
                        data_agendamento,
                        id_dentista,
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

                continuarConsultas = false; // Sai do loop
            } else if (resposta.toLowerCase().trim() === 'cancelar') {
                await client.sendMessage(msg.from, '❌ Agendamento cancelado. Retornando ao menu principal.');
                continuarConsultas = false; // Sai do loop
            } else if (resposta.toLowerCase().trim() === 'menu') {
                await client.sendMessage(msg.from, '📜 Retornando ao menu principal...');
                continuarConsultas = false; // Sai do loop
            } else if (resposta.toLowerCase().trim() === 'nova data') {
                // Solicita nova data
                await client.sendMessage(msg.from, '📅 Envie a nova data para consulta.\n*Data:* (Formato: 📅 04/11/2025)');
                data_agendamento = await solicitarCampo(
                    null,
                    '❌ Data inválida! Envie no formato DD/MM/AAAA Ex: 04/11/2025.',
                    /^\d{2}\/\d{2}\/\d{4}$/,
                    'Nova data recebida'
                );

                if (!data_agendamento) {
                    // Caso não receba a data, encerre o loop
                    await client.sendMessage(msg.from, '❌ Data inválida! O processo será encerrado.');
                    continuarConsultas = false;
                    return;
                }
            } else {
                await client.sendMessage(msg.from, '❌ Resposta inválida. Por favor, digite "Sim" para confirmar, "Cancelar" para cancelar ou "Menu" para retornar ao menu principal.');
            }
        } else {
         
            continuarConsultas = false;
    

        let partes = data_agendamento.split('/');
        let proximaData = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
        
        // Verifica se há horários disponíveis para a data fornecida
        if (!horariosDisponiveis || horariosDisponiveis.length === 0) {
            // Caso não haja horários disponíveis, sugere a próxima data
            proximaData.setDate(proximaData.getDate() + 1);
            let sugestao = proximaData.toLocaleDateString('pt-BR');
        
            // Envia mensagem ao usuário com a sugestão de nova data
            await client.sendMessage(msg.from, `❌ *Nenhum horário disponível para ${data_agendamento}.*\n✅ *Disponível para:* ${sugestao}\nDeseja agendar para esse dia? (Sim/Não)`);
        
            let confirmacao = await solicitarCampo(
                null,
                'Digite "Sim" para confirmar ou "Não" para escolher outra data.',
                /^(sim|não|nao)$/i,
                'Confirmação recebida'
            );
        
            if (/^sim$/i.test(confirmacao)) {
                data_agendamento = sugestao;
        
                let novosHorarios = await verificarDisponibilidade(id_dentista, data_agendamento);
        
                if (novosHorarios && novosHorarios.length > 0) {
                    let mensagemHorarios = `✅ *Horários disponíveis para ${data_agendamento}:*\n\n`;
                    mensagemHorarios += novosHorarios.join('\n');
                    await client.sendMessage(msg.from, mensagemHorarios);
        
                    // Solicita ao usuário para digitar o horário desejado (com ou sem dois-pontos)
                    let horarioEscolhido = await solicitarCampo(
                        null,
                        'Digite o horário desejado (ex: 0900 ou 09:00):',
                        /^([01]\d|2[0-3]):?[0-5]\d$/,
                        'Horário digitado'
                    );
        
                    // Formata para HH:mm caso o usuário tenha digitado sem os dois pontos
                    if (!horarioEscolhido.includes(':')) {
                        horarioEscolhido = horarioEscolhido.slice(0, 2) + ':' + horarioEscolhido.slice(2);
                    }
        
                    // Verifica se o horário digitado está na lista de horários disponíveis
                    if (novosHorarios.includes(horarioEscolhido)) {
                        horario_agendamento = horarioEscolhido;
        
                        await client.sendMessage(msg.from, `📝 *Confirme as informações:*\n\n` +
                            `👤 *Nome:* ${cliente_nome}\n` +
                            `💼 *Serviço:* ${servicosDisponiveis[servico_id].nome}\n` +
                            `📅 *Data:* ${data_agendamento}\n` +
                            `⏰ *Horário:* ${horario_agendamento}\n\n` +
                            `✅ *Digite "Sim"* para confirmar\n❌ *Digite "Cancelar"* para cancelar e voltar ao menu principal\n📜 *Digite "Menu"* para retornar ao menu principal.\n❓ Para consultar outra data, digite "Nova Data".`);
        
                        const resposta = await esperarMensagem(msg.from);
        
                        if (resposta.toLowerCase().trim() === 'sim') {
                            confirmacao = true;
                            await client.sendMessage(msg.from, '✅ Agendamento confirmado! Obrigado.');
        
                            try {
                                const protocoloResponse = await axios.post(`${BASE_URL}/gerar_protocolo.php`, {
                                    cliente_nome,
                                    cliente_telefone,
                                    servico_id,
                                    data_agendamento,
                                    id_dentista,
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
                                } else {
                                    await client.sendMessage(msg.from, '❌ Erro ao confirmar o agendamento. Tente novamente.');
                                }
                            } catch (error) {
                                console.error('Erro ao gerar protocolo:', error);
                                await client.sendMessage(msg.from, '❌ Erro no servidor ao tentar confirmar o agendamento.');
                            }
                        }
                    } else {
                        await client.sendMessage(msg.from, '❌ Horário inválido. Por favor, inicie o processo novamente.');
                    }
                } else {
                    await client.sendMessage(msg.from, `❌ Ainda não há horários disponíveis para ${data_agendamento}.`);
                }
            } else {
                await client.sendMessage(msg.from, `❌ Você optou por não agendar para a nova data. Por favor, tente novamente.`);
            }
        
            return;
        }
                }
          

    
})





const INTERVALO_EXECUCAO = 10 * 60 * 1000; // 10 minutos em milissegundos
const agendamentosNotificados = new Set();  // Defina o Set para armazenar notificações enviadas

async function enviarLembretes(client) {
    try {
        console.log('🔄 Verificando agendamentos...');
        const response = await axios.get(`${BASE_URL}/consultar-agendamentos.php`);
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
            const chaveConfirmacaoAntes = `${cliente_telefone}-${dataFormatada}-confirmacao-antes`; // Correção aqui

            console.log(`📅 Agendamento: ${cliente_nome} às ${horaFormatada} (${minutoAgendamento} min)`);

            // 🔹 Lembrete de confirmação entre 9:30 e 10:00
            const horarioInicioConfirmacao = 9 * 60 + 30; // 9:30 em minutos (570)
            const horarioLimiteConfirmacao = 10 * 60; // 10:00 em minutos (600)

            if (
                !agendamentosNotificados.has(chaveConfirmacaoManha) &&
                horaAtualEmMinutos >= horarioInicioConfirmacao &&
                horaAtualEmMinutos < horarioLimiteConfirmacao
            ) {
                console.log(`📢 Enviando mensagem de confirmação da manhã para ${cliente_telefone}`);

                const mensagemConfirmacao = `👋 Olá, *${cliente_nome}*!\nSeu agendamento está marcado para hoje às ${horaFormatada}.\n📅 Data: ${dataFormatada}\n 🦷 Serviço: ${servico}\n\nVocê pode confirmar sua presença? ✅\n\nAguardamos seu retorno! 😊`;

                try {
                    const numeroWhatsApp = `${cliente_telefone}@c.us`;
                    await client.sendMessage(numeroWhatsApp, mensagemConfirmacao);
                    console.log(`✅ Confirmação da manhã enviada para ${cliente_telefone}`);
                    agendamentosNotificados.add(chaveConfirmacaoManha);
                } catch (error) {
                    console.error(`❌ Erro ao enviar confirmação para ${cliente_telefone}:`, error);
                }
            }

            // 🔹 Segundo lembrete de confirmação: Entre 30 e 40 minutos antes do horário agendado
            const minutosAntes = Math.floor(Math.random() * (40 - 30 + 1)) + 30; // Valor aleatório entre 30 e 40 minutos
            const horarioEnvioConfirmacao = minutoAgendamento - minutosAntes;

            if (!agendamentosNotificados.has(chaveConfirmacaoAntes) && horaAtualEmMinutos >= horarioEnvioConfirmacao && horaAtualEmMinutos < minutoAgendamento) {
                console.log(`📢 Enviando segunda confirmação para ${cliente_telefone}`);

                const mensagemConfirmacaoAntes = `🔔 Olá, *${cliente_nome}*!\nLembrete do seu agendamento:\n\n📅 Data: ${dataFormatada}\n🕒 Horário: ${horaFormatada}\n 🦷 Serviço: ${servico}\n\nPodemos confirmar sua presença? 😊`;

                try {
                    const numeroWhatsApp = `${cliente_telefone}@c.us`;
                    await client.sendMessage(numeroWhatsApp, mensagemConfirmacaoAntes);
                    console.log(`✅ Segunda confirmação enviada para ${cliente_telefone}`);
                    agendamentosNotificados.add(chaveConfirmacaoAntes); // Marcar como notificado
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

async function enviarFelizAniversario(client) {
    try {
        // Faz a requisição para pegar os aniversariantes
        const response = await axios.get(`${BASE_URL}/consultar-data_nascimento_bot.php`);

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
