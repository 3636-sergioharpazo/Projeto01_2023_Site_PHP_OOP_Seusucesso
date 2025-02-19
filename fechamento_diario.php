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

// Verificar se foi enviado o fechamento
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Atualiza o status de todos os pedidos de hoje para "fechado"
    $stmt = $pdo->prepare('UPDATE pedidos SET status = "fechado" WHERE DATE(data_pedido) = CURDATE()');
    $stmt->execute();

    echo "<h3>Fechamento do dia realizado com sucesso.</h3>";
}

// Consulta para obter os pedidos do dia
$stmt = $pdo->prepare('SELECT * FROM pedidos WHERE DATE(data_pedido) = CURDATE()');
$stmt->execute();
$pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<html>
<head>
    <title>Fechamento Diário</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .table th, .table td {
            text-align: center;
        }
    </style>
</head>
<body class="container">
    <h2>Fechamento Diário</h2>

    <?php if (count($pedidos) > 0): ?>
        <h4>Pedidos do dia:</h4>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Protocolo</th>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Valor Total</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($pedidos as $pedido): ?>
                    <tr>
                        <td><?= $pedido['protocolo'] ?></td>
                        <td><?= $pedido['idProduto'] ?></td> <!-- Adapte para o nome do produto se necessário -->
                        <td><?= $pedido['quantidade'] ?></td>
                        <td>R$ <?= number_format($pedido['valorTotal'], 2, ',', '.') ?></td>
                        <td><?= $pedido['status'] ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <form method="POST" action="fechamento_diario.php">
            <button type="submit" class="btn btn-success">Fechar Pedidos do Dia</button>
        </form>

        <button class="btn btn-primary mt-3" onclick="imprimirFechamento()">Imprimir Fechamento</button>

    <?php else: ?>
        <p>Nenhum pedido encontrado para o dia de hoje.</p>
    <?php endif; ?>
</body>
<script>
    function imprimirFechamento() {
        var conteudo = document.body.innerHTML;
        var inicio = '<html><head><title>Fechamento Diário</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"></head><body>';
        var fim = '</body></html>';
        var htmlImpressao = inicio + conteudo + fim;
        
        var janela = window.open('', '', 'width=800, height=600');
        janela.document.write(htmlImpressao);
        janela.document.close();
        janela.print();
    }
</script>
</html>
