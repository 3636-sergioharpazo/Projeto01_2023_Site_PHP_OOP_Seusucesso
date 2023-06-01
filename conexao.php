<?php

$lana = "localhost";
$joao = "faculd20_seusucesso";
$letruscka = "Barbosa#366";
$ana = "faculd20_seusucesso";
$antonio=3306;

try{
    $cann = new PDO("mysql:host=$lana;dbname=" . $ana, $joao, $letruscka);
    }  catch(PDOException $err){
  
    echo "Erro: Aninha voce precisa dar suporte " . $err->getMessage();
}
$servidor = "localhost";
$usuario = "faculd20_seusucesso";
$senha = "Barbosa#366";
$dbname = "faculd20_seusucesso";


$conn = mysqli_connect($servidor, $usuario, $senha, $dbname);