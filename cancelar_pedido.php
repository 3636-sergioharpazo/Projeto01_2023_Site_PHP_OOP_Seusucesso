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

// Verificar se foi enviado o protocolo
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['protocolo'])) {
    $protocolo = $_POST['protocolo'];

    // Verificar se o pedido existe
    $stmt = $pdo->prepare('SELECT * FROM pedidos WHERE protocolo = :protocolo');
    $stmt->execute(['protocolo' => $protocolo]);
    $pedido = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($pedido) {
        // Cancelar o pedido
        $stmt = $pdo->prepare('UPDATE pedidos SET status = "cancelado" WHERE protocolo = :protocolo');
        $stmt->execute(['protocolo' => $protocolo]);

        echo "<h3>Pedido com protocolo $protocolo foi cancelado com sucesso.</h3>";
    } else {
        echo "<h3>Pedido não encontrado com o protocolo informado.</h3>";
    }
} else {
    ?>
    <html>
    <head>
        <title>Cancelar Pedido</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="container">
        <h2>Cancelar Pedido</h2>
        <form method="POST" action="cancelar_pedido.php">
            <div class="mb-3">
                <label for="protocolo" class="form-label">Digite o Protocolo do Pedido</label>
                <input type="text" class="form-control" id="protocolo" name="protocolo" required>
            </div>
            <button type="submit" class="btn btn-danger">Cancelar Pedido</button>
        </form>
    </body>
    </html>
    <?php
}
?>
