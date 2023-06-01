
document.ready = function(){

};

  var deadline = new Date("dec 31, 2022 15:37:25").getTime();
	
  var x = setInterval(function() {
	
  var now = new Date().getTime();
  var t = deadline - now;
  var days = Math.floor(t / (1000 * 60 * 60 * 24));
  var hours = Math.floor((t%(1000 * 60 * 60 * 24))/(1000 * 60 * 60));
  var minutes = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((t % (1000 * 60)) / 1000);
  document.getElementById("contador").innerHTML =days ;
  document.getElementById("contador2").innerHTML =hours;
  document.getElementById("contador3").innerHTML = minutes; 
  document.getElementById("contador4").innerHTML =seconds; 
  document.getElementById("contador5").innerHTML =days ;
  document.getElementById("contador6").innerHTML =hours;
  document.getElementById("contador7").innerHTML = minutes; 
  document.getElementById("contador8").innerHTML =seconds; 
  
  if (t < 0) {
		  clearInterval(x);
document.getElementById("contador5").innerHTML ='0' ;
  document.getElementById("contador6").innerHTML ='0';
  document.getElementById("contador7").innerHTML = '0'; 
  document.getElementById("contador8").innerHTML ='0'; 
  		  
		  document.getElementById("contador").innerHTML ='0';
		  document.getElementById("contador1").innerHTML ='0';
		  document.getElementById("contador2").innerHTML ='0' ; 
		  document.getElementById("contador3").innerHTML = '0'; }
  }, 1000);
  
