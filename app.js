var express = require('express');
var app = express();

//Static resources server
app.use(express.static(__dirname + '/www'));

var server = app.listen(8080, function () {
	var port = server.address().port;
	console.log('Server running at port %s', port);
});

var io = require('socket.io')(server);

io.on('connection', function(client) {
	console.log('User connected');

	client.on('joinGame', function(tankId){
		console.log(tankId + ' joined the game');
		client.emit('addTank', { id: tankId, isLocal: true });
		client.broadcast.emit('addTank', { id: tankId, isLocal: false} );
	});

});

function ServerGame(){

}

ServerGame.prototype = {

}
