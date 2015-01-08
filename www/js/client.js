$(document).ready( function(){

	var width = 1100;
	var height = 580;
	var game = new Game('#arena', width, height);

	$('#join').click( function(){
		var tankName = $('#tank-name').val();
		joinGame(tankName, game);
	});

	$('#tank-name').keyup( function(e){
		var tankName = $('#tank-name').val();
		var k = e.keyCode || e.which;
		if(k == 13){
			joinGame(tankName, game);
		}
	});

});


function joinGame(tankName, game){
	if(tankName != ''){
		game.addTank(tankName, 1);
		$('#prompt').hide();
	}
}