<?php
function criarBotNaVps($nome_cliente, $id_empresa) {
    $url = "https://api.sua-vps.com/criar-bot";  // URL da sua API master na VPS (ajuste aqui)
    
    $data = [
        'nome_cliente' => $nome_cliente,
        'id_empresa' => $id_empresa
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    if(curl_errno($ch)) {
        $erro = curl_error($ch);
        curl_close($ch);
        throw new Exception("Erro ao conectar na API da VPS: $erro");
    }
    
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode != 200) {
        throw new Exception("API da VPS retornou HTTP $httpCode: $response");
    }
    
    $json = json_decode($response, true);
    if(!$json || !isset($json['success']) || !$json['success']) {
        throw new Exception("Erro na criação do bot: " . ($json['error'] ?? 'Resposta inválida'));
    }
    
    return $json;
}

// Exemplo de uso após cadastro de cliente
try {
    $nome_cliente = "Consultório AR";  // Pegue isso do seu cadastro
    $id_empresa = 1;                    // Id do cliente/empresa cadastrado
    
    $resultado = criarBotNaVps($nome_cliente, $id_empresa);
    echo "Bot criado com sucesso no domínio: " . $resultado['domain'];
} catch (Exception $e) {
    echo "Falha ao criar bot: " . $e->getMessage();
}
