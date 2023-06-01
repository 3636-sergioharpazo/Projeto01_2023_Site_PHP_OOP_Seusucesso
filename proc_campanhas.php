<?php
session_start();


include_once("conexao.php");

$responsavel = filter_input(INPUT_POST,'nome', FILTER_SANITIZE_STRING);
$email = $_POST['email'];
$assunto = $_POST['assunto'].'Plano:'.$_POST['plano'];
$plano=$_POST['plano'];



$result_usuario = "INSERT INTO cadastra_campanhas(nome,email,assunto,plano,data)VALUES(:nome,:email,:assunto,:plano,NOW())";
$resultado_usuario =$cann->prepare($result_usuario);
$resultado_usuario->bindParam(':nome',$responsavel);
$resultado_usuario->bindParam(':email',$email);
$resultado_usuario->bindParam(':assunto',$assunto);
$resultado_usuario->bindParam(':plano',$plano);
$resultado_usuario->execute();

	
	
	
    echo "
    <script type=\"text/javascript\">
   
    setTimeout(function() {
      window.location.href = 'https://api.whatsapp.com/send?phone=5588988423386&text=Olá%20tudo%20bem?%20meu%20nome:%20$responsavel%20E-mail:%20$email%20entrei%20no%20site%20do%20SEU%20SUCESSO.COM,gostaria%20de%20uma%20ajuda!%20alguém%20pode%20me%20ajudar?%20sobre%20assunto%20$assunto%20';
  }, 1000);
  
      </script>
    ";	



			?>