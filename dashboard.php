<?php
// Conexão com o banco de dados
$host = 'localhost';
$dbname = 'churrascaria';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Erro na conexão: " . $e->getMessage());
}

// Consultar total de pedidos realizados no dia
$stmtTotalPedidosDia = $pdo->prepare('SELECT COUNT(*) FROM pedidos WHERE DATE(data_pedido) = CURDATE()');
$stmtTotalPedidosDia->execute();
$totalPedidosDia = $stmtTotalPedidosDia->fetchColumn();

// Consultar total de pedidos fechados no dia
$stmtTotalFechadosDia = $pdo->prepare('SELECT COUNT(*) FROM pedidos WHERE DATE(data_pedido) = CURDATE() AND status = "fechado"');
$stmtTotalFechadosDia->execute();
$totalFechadosDia = $stmtTotalFechadosDia->fetchColumn();

// Consultar total de vendas do mês
$stmtTotalVendasMes = $pdo->prepare('SELECT SUM(valorTotal) FROM pedidos WHERE MONTH(data_pedido) = MONTH(CURDATE())');
$stmtTotalVendasMes->execute();
$totalVendasMes = $stmtTotalVendasMes->fetchColumn();

// Consultar status de pedidos para gráfico (abertos vs fechados)
$stmtStatusPedidos = $pdo->prepare('SELECT status, COUNT(*) FROM pedidos WHERE DATE(data_pedido) = CURDATE() GROUP BY status');
$stmtStatusPedidos->execute();
$statusPedidos = $stmtStatusPedidos->fetchAll(PDO::FETCH_ASSOC);
?>

<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Churrascaria Ceece Gril</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .card-body {
            padding: 1.5rem;
        }
    </style>
</head>
<body>
    <div class="container mt-4">
        <h1 class="text-center">Dashboard - Churrascaria Ceece Gril</h1>

        <!-- Cards com estatísticas -->
        <div class="row">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        Total de Pedidos Hoje
                    </div>
                    <div class="card-body">
                        <h3><?= $totalPedidosDia ?></h3>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card">
                    <div class="card-header bg-success text-white">
                        Pedidos Fechados Hoje
                    </div>
                    <div class="card-body">
                        <h3><?= $totalFechadosDia ?></h3>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card">
                    <div class="card-header bg-warning text-white">
                        Total de Vendas no Mês
                    </div>
                    <div class="card-body">
                        <h3>R$ <?= number_format($totalVendasMes, 2, ',', '.') ?></h3>
                    </div>
                </div>
            </div>
        </div>

        <!-- Gráfico de Status dos Pedidos -->
        <div class="row mt-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header bg-info text-white">
                        Status dos Pedidos Hoje
                    </div>
                    <div class="card-body">
                        <canvas id="statusPedidosChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabela de Pedidos Recentes -->
        <div class="row mt-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header bg-dark text-white">
                        Pedidos Recentes
                    </div>
                    <div class="card-body">
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
                                <?php
                                // Consultar pedidos recentes
                                $stmtPedidosRecentes = $pdo->prepare('SELECT * FROM pedidos ORDER BY data_pedido DESC LIMIT 5');
                                $stmtPedidosRecentes->execute();
                                $pedidosRecentes = $stmtPedidosRecentes->fetchAll(PDO::FETCH_ASSOC);

                                foreach ($pedidosRecentes as $pedido):
                                ?>
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
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Script do gráfico -->
    <script>
        var ctx = document.getElementById('statusPedidosChart').getContext('2d');
        var statusPedidosData = <?php echo json_encode($statusPedidos); ?>;
        var statusLabels = statusPedidosData.map(item => item.status);
        var statusCounts = statusPedidosData.map(item => item['COUNT(*)']);
        
        var statusPedidosChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: statusLabels,
                datasets: [{
                    data: statusCounts,
                    backgroundColor: ['#FF5733', '#28A745', '#FFC107', '#6C757D'],
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                return tooltipItem.label + ': ' + tooltipItem.raw;
                            }
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>
