#!/bin/bash

set -e

# --- VARIÁVEIS ---
DOMINIO_PRINCIPAL="agendaeasy.shop"
EMAIL="seu-email@dominio.com"   # <-- coloque seu email aqui para o certbot
USER="www-data"
BASE_DIR="/var/www/html"
BOTS_DIR="${BASE_DIR}/bots"
MODELO_DIR="${BASE_DIR}/modelo_bot"

echo "==> Atualizando o sistema..."
apt update && apt upgrade -y

echo "==> Instalando Node.js, npm e PM2..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g pm2

echo "==> Instalando Nginx, Certbot e UFW..."
apt install -y nginx certbot python3-certbot-nginx ufw git

echo "==> Configurando firewall UFW..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Criando diretórios base..."
mkdir -p $BOTS_DIR
mkdir -p $MODELO_DIR

echo "==> Criando template básico do bot em $MODELO_DIR..."

cat > $MODELO_DIR/index.js <<'EOF'
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();

const NOME_CLIENTE = 'Consultório AR';
const ID_EMPRESA = 1;
const PORT = 3001;
const BASE_URL = 'https://consultorioar1.agendaeasy.shop';

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: `client_${ID_EMPRESA}`
  }),
});

client.on('qr', (qr) => {
  console.log(`QR Code para ${NOME_CLIENTE}:`);
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log(`Cliente ${NOME_CLIENTE} está pronto!`);
});

client.initialize();

app.get('/', (req, res) => {
  res.send(`Bot do cliente ${NOME_CLIENTE} rodando na porta ${PORT}`);
});

app.listen(PORT, () => {
  console.log(`Bot do ${NOME_CLIENTE} escutando na porta ${PORT}`);
});
EOF

cat > $MODELO_DIR/package.json <<'EOF'
{
  "name": "whatsapp-bot-template",
  "version": "1.0.0",
  "description": "Template bot WhatsApp",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "qrcode-terminal": "^0.12.0",
    "whatsapp-web.js": "^1.19.6"
  }
}
EOF

echo "==> Instalando dependências do template bot..."
cd $MODELO_DIR && npm install

echo "==> Criando API master para criar bots automaticamente..."

cat > $BASE_DIR/api-master.js <<'EOF'
const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
app.use(express.json());

const BASE_DIR = '/var/www/html/bots';

function sanitizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase();
}

app.post('/criar-bot', (req, res) => {
  const { nome_cliente, id_empresa } = req.body;
  if (!nome_cliente || !id_empresa) {
    return res.status(400).json({ error: 'nome_cliente e id_empresa são obrigatórios' });
  }

  const nomeSanitizado = sanitizeName(nome_cliente);
  const botDir = path.join(BASE_DIR, `${nomeSanitizado}${id_empresa}`);
  const PORT = 3000 + parseInt(id_empresa);
  const DOMAIN = `${nomeSanitizado}${id_empresa}.agendaeasy.shop`;

  try {
    console.log(`Iniciando criação do bot para ${nome_cliente} (${DOMAIN})`);

    if (!fs.existsSync(botDir)) {
      fs.mkdirSync(botDir, { recursive: true });
      console.log(`Pasta criada: ${botDir}`);
    }

    execSync(`cp -r /var/www/html/modelo_bot/* ${botDir}/`);

    let indexContent = fs.readFileSync(path.join(botDir, 'index.js'), 'utf-8');
    indexContent = indexContent
      .replace(/const NOME_CLIENTE = .+;/, `const NOME_CLIENTE = '${nome_cliente}';`)
      .replace(/const ID_EMPRESA = .+;/, `const ID_EMPRESA = ${id_empresa};`)
      .replace(/const PORT = .+;/, `const PORT = ${PORT};`)
      .replace(/const BASE_URL = .+;/, `const BASE_URL = 'https://${DOMAIN}';`);
    fs.writeFileSync(path.join(botDir, 'index.js'), indexContent);
    console.log('Configurações atualizadas no index.js');

    execSync(`cd ${botDir} && npm install`, { stdio: 'inherit' });

    execSync(`pm2 delete ${nomeSanitizado}${id_empresa} || true`);
    execSync(`pm2 start ${botDir}/index.js --name ${nomeSanitizado}${id_empresa}`);
    execSync('pm2 save');
    console.log('PM2 configurado e bot iniciado');

    return res.json({ success: true, message: 'Bot criado com sucesso', domain: DOMAIN, port: PORT });

  } catch (error) {
    console.error('Erro ao criar bot:', error);
    return res.status(500).json({ error: 'Erro ao criar bot' });
  }
});

app.listen(5000, () => console.log('API master rodando na porta 5000'));
EOF

echo "==> Instalando dependências da API master..."
cd $BASE_DIR
npm init -y
npm install express

echo "==> Criando configuração Nginx com wildcard para subdomínios..."

cat > /etc/nginx/sites-available/$DOMINIO_PRINCIPAL <<EOF
server {
    listen 80;
    server_name *.$DOMINIO_PRINCIPAL;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

server {
    listen 80;
    server_name $DOMINIO_PRINCIPAL;

    location / {
        root /var/www/html;
        index index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$DOMINIO_PRINCIPAL /etc/nginx/sites-enabled/

echo "==> Testando configuração do Nginx..."
nginx -t

echo "==> Reiniciando Nginx..."
systemctl reload nginx

echo "==> Solicitando certificado wildcard via DNS (manual)..."
echo "Importante: Para wildcard SSL é necessário configurar DNS-01 no Certbot."
echo "Use:"
echo "sudo certbot certonly --manual --preferred-challenges=dns -d *.$DOMINIO_PRINCIPAL -d $DOMINIO_PRINCIPAL"

# == ETAPA FINAL: CRIAÇÃO DO BOT E ENVIO PARA API PHP ==

NOME_CLIENTE="Consultório AR"
ID_EMPRESA=1

echo "==> Criando bot via API master para $NOME_CLIENTE (ID $ID_EMPRESA)..."

CRIA_BOT_RESPONSE=$(curl -s -X POST http://localhost:5000/criar-bot \
  -H "Content-Type: application/json" \
  -d "{\"nome_cliente\": \"$NOME_CLIENTE\", \"id_empresa\": $ID_EMPRESA}")

BOT_DOMAIN=$(echo "$CRIA_BOT_RESPONSE" | grep -Po '(?<="domain":")[^"]+')

if [ -z "$BOT_DOMAIN" ]; then
  echo "❌ ERRO: Domínio do bot não foi retornado."
  echo "Resposta completa: $CRIA_BOT_RESPONSE"
  exit 1
fi

FULL_URL="https://$BOT_DOMAIN"
echo "✅ Bot criado em: $FULL_URL"

API_PHP_URL="https://seu-dominio-php.com/salvar_bot_url.php"

echo "==> Enviando URL do bot para API PHP..."

PHP_RESPONSE=$(curl -s -X POST $API_PHP_URL \
  -H "Content-Type: application/json" \
  -d "{\"id_empresa\": $ID_EMPRESA, \"bot_url\": \"$FULL_URL\"}")

echo "Resposta da API PHP: $PHP_RESPONSE"

echo "==> Script finalizado com sucesso!"
