<?php
// menu.php
$menu = [
    1 => ['nome' => 'Picanha', 'preco' => 50.00],
    2 => ['nome' => 'Fraldinha', 'preco' => 40.00],
    3 => ['nome' => 'Costela', 'preco' => 60.00],
];

header('Content-Type: application/json');
echo json_encode($menu);
?>
