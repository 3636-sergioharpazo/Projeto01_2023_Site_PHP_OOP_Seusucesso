<?php
// --- Configuração da conexão ---
$host = 'localhost';
$usuario = 'seu_usuario';
$senha = 'sua_senha';
$banco = 'seu_banco';

$conexao = new mysqli($host, $usuario, $senha, $banco);

if ($conexao->connect_error) {
    die(json_encode(['error' => 'Falha na conexão com o banco de dados: ' . $conexao->connect_error]));
}

// --- Recebe os dados em JSON ---
$dados = json_decode(file_get_contents('php://input'), true);
$id_empresa = isset($dados['id_empresa']) ? intval($dados['id_empresa']) : 0;
$bot_url = isset($dados['bot_url']) ? trim($dados['bot_url']) : '';

// --- Validação ---
if ($id_empresa === 0 || empty($bot_url)) {
    http_response_code(400);
    echo json_encode(['error' => 'id_empresa e bot_url são obrigatórios']);
    exit;
}

// --- INSERT ou UPDATE automático ---
$sql = "INSERT INTO bots_empresa (id_empresa, bot_url)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
            bot_url = VALUES(bot_url),
            updated_at = CURRENT_TIMESTAMP";

$stmt = $conexao->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao preparar a query: ' . $conexao->error]);
    exit;
}

$stmt->bind_param("is", $id_empresa, $bot_url);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Bot URL salva ou atualizada com sucesso']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao executar a query: ' . $stmt->error]);
}

$stmt->close();
$conexao->close();
?>
