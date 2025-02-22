const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3002;

// Diretório para salvar o QR Code (pasta 'public/qrcodes')
const qrCodeDir = path.join(__dirname, 'public', 'qrcodes');

// Função para gerar o QR Code de forma síncrona
function generateQRCode(qr) {
  const qrCodePath = path.join(qrCodeDir, 'qrcode.png');
  try {
    // Gera e salva o QR Code de forma síncrona
    qrcode.toFileSync(qrCodePath, qr);  // Utilizando a versão síncrona
    console.log(`QR Code gerado com sucesso em: ${qrCodePath}`);
  } catch (err) {
    console.error('Erro ao salvar o QR Code:', err);
    // Tenta novamente se falhar
    setTimeout(() => generateQRCode(qr), 5000); // Tenta novamente após 5 segundos
  }
}

// Função assíncrona para inicializar o servidor e o cliente do WhatsApp Web
(async () => {
  // Lançando o Puppeteer com um caminho explícito para o Chromium e sem a interface gráfica
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Servir arquivos estáticos da pasta 'public'
  app.use(express.static(path.join(__dirname, 'public')));

  // Garante que o diretório existe
  if (!fs.existsSync(qrCodeDir)) {
    fs.mkdirSync(qrCodeDir, { recursive: true });
    console.log(`Diretório criado: ${qrCodeDir}`);
  }

  // Cliente do WhatsApp Web
  const client = new Client({
    authStrategy: new LocalAuth(),
  });

  // Quando o QR Code for gerado
  client.on('qr', (qr) => {
    console.log('QR RECEBIDO');
    // Chama a função para gerar o QR Code
    generateQRCode(qr);
  });

  // Quando a conexão for autenticada
  client.on('authenticated', () => {
    console.log('✅ Autenticado com sucesso!');
  });

  // Quando o WhatsApp estiver pronto
  client.on('ready', () => {
    console.log('🚀 WhatsApp Web está pronto!');
  });

  // Inicia o cliente do WhatsApp Web
  client.initialize();

  // Rota para fornecer o status e QR Code para o frontend
  app.get('/status', (req, res) => {
    if (client.isReady) {
      res.json({
        connectionStatus: 'Conectado',
      });
    } else {
      res.json({
        connectionStatus: 'Desconectado',
        qrCodeImage: '/qrcodes/qrcode.png',  // URL do QR Code acessível ao frontend
      });
    }
  });

  // Inicia o servidor Express
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
})();
