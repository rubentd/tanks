var express = require('express');
var app = express();
var counter = 0;

//Static resources server
app.use(express.static(__dirname + '/www'));

var server = app.listen(8080, function () {
	var port = server.address().port;
	console.log('Server running at port %s', port);
});

function GameServer(){
	this.tanks = [];
	this.balls = [];
}

GameServer.prototype = {
	
	addTank: function(tank){
		this.tanks.push(tank);
	},

	removeTank: function(tankId){
		//Remove tank object
		this.tanks = this.tanks.filter( function(t){return t.id != tankId} );
	},

	//Sync tank with new data received from a client
	syncTank: function(newTankData){
		this.tanks.forEach( function(tank){
			if(tank.id == newTankData.id){
				tank.x = newTankData.x;
				tank.y = newTankData.y;
				tank.baseAngle = newTankData.baseAngle;
				tank.cannonAngle = newTankData.cannonAngle;
			}
		});
	},

	syncBalls: function(newBalls){
		this.balls = newBalls;
	},

	getData: function(){
		var gameData = {};
		gameData.tanks = this.tanks;
		gameData.balls = this.balls;
		return gameData;
	}

}

var game = new GameServer();

var io = require('socket.io')(server);

/* Connection events */

io.on('connection', function(client) {
	console.log('User connected');

	client.on('joinGame', function(tank){
		console.log(tank.id + ' joined the game');
		var initX = getRandomInt(40, 900);
		var initY = getRandomInt(40, 500);
		client.emit('addTank', { id: tank.id, type: tank.type, isLocal: true, x: initX, y: initY });
		client.broadcast.emit('addTank', { id: tank.id, type: tank.type, isLocal: false, x: initX, y: initY} );
		game.addTank({ id: tank.id, type: tank.type});
	});

	client.on('sync', function(data){
		//Receive data from clients
		if(data.tank != undefined){
			game.syncTank(data.tank);
		}
		if(data.balls != undefined){
			game.syncBalls(data.balls);
		}
		//Broadcast data to clients
		client.broadcast.emit('sync', game.getData());
		counter ++;
	});

	client.on('leaveGame', function(tankId){
		game.removeTank(tankId);
		console.log(tankId + ' has left the game');
		client.broadcast.emit('removeTank', tankId);
	});

});

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}