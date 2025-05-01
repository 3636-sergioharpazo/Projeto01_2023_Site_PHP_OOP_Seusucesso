<?php
// Conexão com o banco de dados
$host = 'localhost';
$dbname = 'churrascaria';
$username = 'root';
$password = '';

// Conexão PDO
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Erro na conexão: " . $e->getMessage());
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pedido = json_decode(file_get_contents('php://input'), true);
    $idProduto = $pedido[0]['id'];
    $quantidade = $pedido[0]['quantidade'];
    $protocolo = $pedido[0]['protocolo'];

    // Consulta para pegar o preço do produto
    $stmt = $pdo->prepare('SELECT preco FROM produtos WHERE id = :id');
    $stmt->execute(['id' => $idProduto]);
    $produto = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $valorTotal = $produto['preco'] * $quantidade;

    // Salvar pedido no banco de dados
    $stmt = $pdo->prepare('
        INSERT INTO pedidos (idProduto, quantidade, protocolo, valorTotal)
        VALUES (:idProduto, :quantidade, :protocolo, :valorTotal)
    ');
    $stmt->execute([
        'idProduto' => $idProduto,
        'quantidade' => $quantidade,
        'protocolo' => $protocolo,
        'valorTotal' => $valorTotal
    ]);

    echo json_encode(['total' => $valorTotal]);
}
