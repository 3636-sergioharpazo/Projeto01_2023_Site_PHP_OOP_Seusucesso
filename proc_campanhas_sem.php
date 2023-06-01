<?php
session_start();


include_once("conexao.php");

 $responsavel = filter_input(INPUT_POST,'nome', FILTER_SANITIZE_STRING);
$email = $_POST['email'];
$assunto="capturaInicial";

$result_usuario = "INSERT INTO cadastra_campanhas(nome,email,assunto,data)VALUES(:nome,:email,:assunto,NOW())";
$resultado_usuario =$cann->prepare($result_usuario);
$resultado_usuario->bindParam(':nome',$responsavel);
$resultado_usuario->bindParam(':email',$email);
$resultado_usuario->bindParam(':assunto',$assunto);
$resultado_usuario->execute();




			?>