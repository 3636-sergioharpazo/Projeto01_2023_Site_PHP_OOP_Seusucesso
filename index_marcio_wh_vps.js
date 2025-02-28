const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf'); // Para remover diretórios não vazios
const express = require('express');
const axios = require('axios');
const { exec } = require('child_process');

const app = express();
const PORT = 3004; //8445 do servidor vps
const qrCodeDir = '/var/www/html/bot3';  // Diretório onde o QR será salvo MARCIO WH 

let isQRCodeGenerated = false; // Controle para evitar a repetição do QR Code
let qrCodeGeneratedAt = null;  // Timestamp da geração do QR Code
let sessionData = null; // Armazena a sessão do cliente
let reconnectAttempts = 0;  // Conta tentativas de reconexão
require('events').EventEmitter.defaultMaxListeners = 100; // Ou um número maior, se necessário

// Função para gerar o QR Code e salvar
function generateQRCode(qr) {
  const qrCodePath = path.join(qrCodeDir, 'qrcode.png');
  fs.unlink(qrCodePath, (unlinkErr) => {
    qrcode.toFile(qrCodePath, qr, {
      width: 400, // Definir o tamanho do QR Code
      margin: 1   // Definir a margem
    }, (err) => {
      if (err) {
        console.error('Erro ao gerar o QR Code:', err);
        return;
      }
      console.log(`QR Code gerado e salvo com sucesso em: ${qrCodePath}`);
      isQRCodeGenerated = true;
      qrCodeGeneratedAt = Date.now();
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
    clientId: 'bot3'
  
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
    timeout: 30000, // Timeout de 30 segundos
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
// Endpoint para desconectar e gerar um novo QR Code
app.get('/disconnect', (req, res) => {
  if (client) {
    client.destroy().then(() => {
      console.log('Cliente desconectado e sessão reiniciada');
      restartClient(); // Reinicia o cliente, gerando um novo QR Code
      res.json({ message: 'Cliente desconectado e QR Code gerado novamente.' });
    }).catch((err) => {
      console.error('Erro ao desconectar cliente:', err);
      res.status(500).json({ error: 'Erro ao desconectar cliente' });
    });
  } else {
    res.status(400).json({ error: 'Cliente não está ativo.' });
  }
});
client.on('disconnected', (reason) => {
  console.log(`❌ Cliente desconectado: ${reason}`);
  // Apaga o QR code e gera um novo quando desconectar
  fs.unlink(path.join(qrCodeDir, 'qrcode.png'), (err) => {
    if (err) {
      console.error('Erro ao apagar o QR Code:', err);
    }
    generateQRCode(reason); // Gera um novo QR Code após a desconexão
  });
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


// Manipulação de mensagens
client.on('message', async msg => {
    const cliente_telefone = msg.from.split('@')[0];

    // Resposta ao menu inicial
    if (/^(menu|Menu|dia|tarde|noite|oi|Oi|Voltar|voltar|Olá|olá|ola|Ola)$/i.test(msg.body) && msg.from.endsWith('@c.us')) {
        const chat = await msg.getChat();
        const contact = await msg.getContact();
        const name = contact.pushname || "Cliente";

       
        await delay(2000);
        await chat.sendStateTyping();
        await delay(2000);

        await client.sendMessage(
            msg.from,
            `Olá, ${name.split(" ")[0]}! 👋 Eu sou o assistente virtual do *WM Hair & Beauty*. Como posso ajudá-lo(a) hoje? Escolha uma das opções abaixo:\n\n` +
            `1️⃣ - Serviços e preços\n` +
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


        try {
    // Usando axios para buscar os serviços do backend
    const response = await axios.get('https://antoniooliveira.shop/consultar-servicos_bot.php');
    const servicosDisponiveis = response.data.servicos;

    // Agrupar serviços por categoria (função)
    const servicosPorCategoria = {};

    // Funções padrão com emojis
    const emojis = {
        'Cabeleireiro': '💇‍♀️',
        'Manicure': '💅',
        'Estética': '💆‍♀️',
        'Massoterapia': '💆‍♂️',
        'Barbeiro': '🧔',
        'Outros': '🛠️'
    };

    // Agrupar os serviços por função, pegando as funções dinamicamente
    Object.entries(servicosDisponiveis).forEach(([funcao, servicos]) => {
        if (!servicosPorCategoria[funcao]) {
            servicosPorCategoria[funcao] = [];
        }
        servicos.forEach(({ nome, preco, id }) => {
            // Verificar se os dados essenciais (nome, preco, id) estão presentes
            if (nome && preco && id) {
                // Convertendo preco de string com vírgula para número
                servicosPorCategoria[funcao].push({ nome, preco: parseFloat(preco.replace(',', '.')), id });
            }
        });
    });

    // Gerar a lista de serviços e preços por categoria (função)
    let listaServicos = '💇‍♀️ *Serviços e Preços* 💇‍♂️\n\n';

    // Iterar sobre todas as categorias (funções) disponíveis
    for (const [funcao, servicos] of Object.entries(servicosPorCategoria)) {
        if (servicos.length > 0) {
            // Se a função não possui um emoji associado, use um emoji genérico
            const emoji = emojis[funcao] || '🛠️';

            // Adicionar a função com o emoji
            listaServicos += `*${emoji} ${funcao}*\n`; 

            // Ordenar os serviços por ID
            servicos.sort((a, b) => a.id - b.id)
                .forEach(({ nome, preco, id }) => {
                    // Destacar o ID em negrito e formatar o preço
                    listaServicos += `*${id}* - ${nome.padEnd(30)} - R$ ${preco.toFixed(2).replace('.', ',')}\n`;
                });

            listaServicos += '\n'; // Adiciona espaçamento entre categorias
        }
    }

    // Envia a mensagem formatada com os serviços e preços
    await client.sendMessage(
        msg.from,
        listaServicos + `\nDigite *2* para agendar seu horário!`
    );
} catch (error) {
    console.error('Erro ao carregar serviços:', error);
    await client.sendMessage(msg.from, '❌ Erro ao consultar serviços. Tente novamente mais tarde.');
}

    }

   

    // Resposta para "Localização"
    if (msg.body === '4' && msg.from.endsWith('@c.us')) {

        const chat = await msg.getChat();
        await delay(2000);
        await chat.sendStateTyping();
        await delay(2000);


        await client.sendMessage(
            msg.from,
            `📍 *Localização do WM Hair & Beauty* 📍\n\n` +
            `Endereço: Avenida Bela Vista, 1234, Centro\n` +
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


 try {
    // Usando axios para buscar os serviços do backend
    const response = await axios.get('https://antoniooliveira.shop/consultar-servicos_bot_p.php');
    const servicosDisponiveis = response.data.servicos;

    // Agrupar serviços por categoria (função)
    const servicosPorCategoria = {};

    // Funções padrão com emojis
    const emojis = {
        'Cabeleireiro': '💇‍♀️',
        'Manicure': '💅',
        'Estética': '💆‍♀️',
        'Massoterapia': '💆‍♂️',
        'Barbeiro': '🧔',
        'Outros': '🛠️'
    };

    // Agrupar os serviços por função, pegando as funções dinamicamente
    Object.entries(servicosDisponiveis).forEach(([funcao, servicos]) => {
        if (!servicosPorCategoria[funcao]) {
            servicosPorCategoria[funcao] = [];
        }
        servicos.forEach(({ nome, preco, id }) => {
            // Verificar se os dados essenciais (nome, preco, id) estão presentes
            if (nome && preco && id) {
                // Convertendo preco de string com vírgula para número
                servicosPorCategoria[funcao].push({ nome, preco: parseFloat(preco.replace(',', '.')), id });
            }
        });
    });

    // Gerar a lista de serviços e preços por categoria (função)
    let listaServicos = '💇‍♀️ *Serviços e Preços - PROMOÇÕES DA SEMANA* 💇‍♂️\n\n';

    // Iterar sobre todas as categorias (funções) disponíveis
    for (const [funcao, servicos] of Object.entries(servicosPorCategoria)) {
        if (servicos.length > 0) {
            // Se a função não possui um emoji associado, use um emoji genérico
            const emoji = emojis[funcao] || '🛠️';

            // Adicionar a função com o emoji
            listaServicos += `*${emoji} ${funcao}*\n`; 

            // Ordenar os serviços por ID
            servicos.sort((a, b) => a.id - b.id)
                .forEach(({ nome, preco, id }) => {
                    // Destacar o ID em negrito e formatar o preço
                    listaServicos += `*${id}* - ${nome.padEnd(30)} - R$ ${preco.toFixed(2).replace('.', ',')}\n`;
                });

            listaServicos += '\n'; // Adiciona espaçamento entre categorias
        }
    }

    // Envia a mensagem formatada com os serviços e preços
    await client.sendMessage(
        msg.from,
        listaServicos + `\nDigite *2* para agendar seu horário!`
    );
} catch (error) {
    console.error('Erro ao carregar serviços:', error);
    await client.sendMessage(msg.from, '❌ Erro ao consultar serviços. Tente novamente mais tarde.');
}
}

// Verifica se o cliente digitou '6' para iniciar a consulta


// Função assíncrona para tratar o código do agendamento
async function handleAgendamento(msg) {
    
    const codigoAgendamento = msg.body;

    try {
        // Envia a requisição POST para consultar o código do agendamento
        const response = await axios.post('https://antoniooliveira.shop/consulta_bot_codigo.php', {
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
// Menu 2
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
        let campoValido = false;
        while (!campoValido) {
            if (!campo || (regex && !regex.test(campo))) {
                if (campo && regex && !regex.test(campo)) {
                    await client.sendMessage(msg.from, mensagemValidacao);
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
            } else {
                campoValido = true; // Quando o campo for válido
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
            const response = await axios.post('https://antoniooliveira.shop/verificar-horario.php', {
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

    let listaServicos = ''; 
    let servicosDisponiveis = [];
    try {
        // Usando axios para buscar os serviços do backend
        const response = await axios.get('https://antoniooliveira.shop/consultar-servicos_bot.php');
        servicosDisponiveis = response.data.servicos || [];

        // Agrupar serviços por categoria (função)
        const servicosPorCategoria = {};

        // Funções padrão com emojis
        const emojis = {
            'Cabeleireiro': '💇‍♀️',
            'Manicure': '💅',
            'Estética': '💆‍♀️',
            'Massoterapia': '💆‍♂️',
            'Barbeiro': '🧔',
            'Outros': '🛠️'
        };

        // Agrupar os serviços por função, pegando as funções dinamicamente
        Object.entries(servicosDisponiveis).forEach(([funcao, servicos]) => {
            if (!servicosPorCategoria[funcao]) {
                servicosPorCategoria[funcao] = [];
            }
            servicos.forEach(({ nome, preco, id }) => {
                if (nome && preco && id) {
                    servicosPorCategoria[funcao].push({ nome, preco: parseFloat(preco.replace(',', '.')), id });
                }
            });
        });

        // Gerar a lista de serviços e preços por categoria (função)
        listaServicos = '💇‍♀️ *Serviços e Preços* 💇‍♂️\n\n';

        for (const [funcao, servicos] of Object.entries(servicosPorCategoria)) {
            if (servicos.length > 0) {
                const emoji = emojis[funcao] || '🛠️';
                listaServicos += `*${emoji} ${funcao}*\n`; 

                servicos.sort((a, b) => a.id - b.id)
                    .forEach(({ nome, preco, id }) => {
                        listaServicos += `*${id}* - ${nome.padEnd(30)} - R$ ${preco.toFixed(2).replace('.', ',')}\n`;
                    });

                listaServicos += '\n'; // Adiciona espaçamento entre categorias
            }
        }

        await client.sendMessage(
            msg.from,
            `🌟 *Agendamento de Horário* 🌟\n\n` +
            `Digite *Nome Completo:*\n\n` +
            `Escolha *Código do Serviço:* da lista abaixo:\n\n${listaServicos}\n\n` +
            `Digite a *Data:*  (Formato: 📅 DD/MM/AAAA)\n\n` +
            `Digite *Menu* para retornar ao menu principal.`
        );
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        await client.sendMessage(msg.from, '❌ Erro ao consultar serviços. Tente novamente mais tarde.');
    }

    // Solicita o nome e valida para não conter números
    cliente_nome = await solicitarCampo(
        null, 
        '❌ Nome inválido. Por favor, envie seu nome completo sem números.', 
        /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/, 
        'Nome recebido'
    );
    if (!cliente_nome) return;

    // Solicita o serviço após o nome ser validado
    servico_id = await solicitarCampo(
        null, 
        `❌ Código inválido. Escolha um código válido:\n${listaServicos}`, 
        /^[0-9]+$/, 
        'Serviço escolhido'
    );
    if (!servico_id) return;

    // Solicita a data após o serviço ser validado
    data_agendamento = await solicitarCampo(
        null, 
        '❌ Data inválida! Envie no formato DD/MM/AAAA.', 
        /^\d{2}\/\d{2}\/\d{4}$/, 
        'Data recebida'
    );
    if (!data_agendamento) return;

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

    horario_agendamento = await solicitarCampo(horario_agendamento, '❌ Horário inválido! Envie no formato HH:mm.', /^([01]\d|2[0-3]):([0-5]\d)$/, 'Horário recebido');
    if (!horario_agendamento) return;

    // Confirmação do agendamento
    if (Array.isArray(servicosDisponiveis)) {
        const servicoEncontrado = servicosDisponiveis.find(service => service.id == servico_id);
        const nomeServico = servicoEncontrado ? servicoEncontrado.nome : 'Serviço não encontrado';
        const precoServico = servicoEncontrado ? servicoEncontrado.preco : 'Preço não encontrado';

        await client.sendMessage(
            msg.from,
            `📝 *Confirme as informações:*\n\n` +
            `👤 *Nome:* ${cliente_nome}\n` +
            `💼 *Serviço:* ${nomeServico}\n` +
            `💰 *Preço:* R$ ${precoServico}\n` +
            `📅 *Data:* ${data_agendamento}\n` +
            `⏰ *Horário:* ${horario_agendamento}\n\n` +
            `Digite *Sim* ✅ para confirmar\n` +
            `Digite *Cancelar* ❌ para cancelar e voltar ao menu principal\n` +
            `Digite *Menu* para retornar ao menu principal.`
        );
    } else {
        await client.sendMessage(msg.from, '❌ Erro ao processar serviços. Tente novamente.');
    }

    const resposta = await esperarMensagem(msg.from);
    if (resposta.toLowerCase() === 'sim') {
        confirmacao = true;
    } else {
        await client.sendMessage(msg.from, '❌ Agendamento cancelado. Retornando ao menu principal.');
        return;
    }

    try {
        const protocoloResponse = await axios.post('https://antoniooliveira.shop/gerar_protocolo.php', {
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
                `✅ Seu agendamento foi confirmado com sucesso! \n\n` +
                `Protocolo: *${protocolo}*\n` +
                `Aguarde nosso contato para mais informações.`
            );
        }
    } catch (error) {
        console.error('Erro ao gerar protocolo:', error);
        await client.sendMessage(msg.from, '❌ Erro ao gerar o protocolo. Tente novamente.');
    }
  
//final do menu 2







}




})

const agendamentosNotificados = new Set();

async function enviarLembretes() {
   // console.log('🔔 Verificando agendamentos para enviar lembretes...');

    try {
        const response = await axios.get('https://antoniooliveira.shop/consultar-agendamentos.php');
        //console.log('Resposta da API:', response.data); 

        if (!response.data || !response.data.agendamentos || response.data.agendamentos.length === 0) {
          //  console.log('⚠️ Nenhum agendamento encontrado.');
            return;
        }

        const agendamentos = response.data.agendamentos;

        for (const agendamento of agendamentos) {
            const { cliente_telefone, cliente_nome, servico, data_agendamento, horario_agendamento } = agendamento;

            if (!cliente_telefone || !cliente_nome || !servico || !data_agendamento || !horario_agendamento) {
                console.log(`⚠️ Dados incompletos para o telefone: ${cliente_telefone}. Verifique na plataforma.`);
                continue;
            }

            // Converter data e horário para o formato dd/mm/aaaa HH:mm
            const dataObj = new Date(`${data_agendamento}T${horario_agendamento}`);
            const dataFormatada = dataObj.toLocaleDateString('pt-BR');
            const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const chaveUnica = `${cliente_telefone}-${dataFormatada}-${horaFormatada}`;
            if (agendamentosNotificados.has(chaveUnica)) {
               // console.log(`⏳ Lembrete já enviado para ${cliente_telefone}, ignorando...`);
                continue;
            }

            const mensagem = `🔔 Olá, ${cliente_nome}! Lembrete do seu agendamento:\n\n📅 Data: ${dataFormatada}\n🕒 Horário: ${horaFormatada}\n💇 Serviço: ${servico}\n\nEstamos te esperando! 😊`;

            if (client && client.sendMessage) {
                const numeroWhatsApp = `${cliente_telefone}@c.us`;
                await client.sendMessage(numeroWhatsApp, mensagem);
                agendamentosNotificados.add(chaveUnica);
              //  console.log(`📩 Lembrete enviado para ${cliente_telefone}`);
            } else {
                console.error('❌ Erro: client.sendMessage não está definido');
            }
        }
    } catch (error) {
        console.error('❌ Erro ao buscar agendamentos:', error.message || error);
    }
}
