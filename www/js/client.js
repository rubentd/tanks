var WIDTH = 1100;
var HEIGHT = 580;
var socket = io.connect('http://localhost:8080');
var game = new Game('#arena', WIDTH, HEIGHT, socket);

socket.on('addTank', function(tank){
	game.addTank(tank.id, getRandomInt(1, 3), tank.isLocal);
});

$(document).ready( function(){

	$('#join').click( function(){
		var tankName = $('#tank-name').val();
		joinGame(tankName, socket);
	});

	$('#tank-name').keyup( function(e){
		var tankName = $('#tank-name').val();
		var k = e.keyCode || e.which;
		if(k == 13){
			joinGame(tankName, socket);
		}
	});

});

$(window).on('beforeunload', function(){
	socket.close();
});

function joinGame(tankName, socket){
	if(tankName != ''){
		$('#prompt').hide();
		socket.emit('joinGame', tankName);
	}
}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}