<?php
			
			$url = (isset($_GET['url'])) ? $_GET['url'] :'inicio.php';
						$explode = explode('/',$url);
				
					$paginas = array('index','seusucesso' );
					
					if(isset($explode[0]) && $explode[0] == '') 
						{			
							include_once "seusucesso.php";
						}
						elseif($explode[0] != '') 
						{
							
							if(isset($explode[0]) && in_array($explode[0], $paginas)){	
								
								include_once $explode[0].".php";
									
							} else{
							
								include_once "seusucesso.php";
							}
					
						}
						
					
?>
		
		