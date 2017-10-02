var DEBUG = true;
var INTERVAL = 50;
var ROTATION_SPEED = 5;
var ARENA_MARGIN = 30;

function Game(arenaId, w, h, socket){
	this.tanks = []; //Tanks (other than the local tank)
	this.balls = [];
	this.width = w;
	this.height = h;
	this.$arena = $(arenaId);
	this.$arena.css('width', w);
	this.$arena.css('height', h);
	this.socket = socket;

	var g = this;
	setInterval(function(){
		g.mainLoop();
	}, INTERVAL);
}

Game.prototype = {

	addTank: function(id, name, type, isLocal, x, y, hp){
		var t = new Tank(id, name, type, this.$arena, this, isLocal, x, y, hp);
		if(isLocal){
			this.localTank = t;
		}else{
			this.tanks.push(t);
		}
	},

	removeTank: function(tankId){
		//Remove tank object
		this.tanks = this.tanks.filter( function(t){return t.id != tankId} );
		//remove tank from dom
		$('#' + tankId).remove();
		$('#info-' + tankId).remove();
	},

	killTank: function(tank){
		tank.dead = true;
		this.removeTank(tank.id);
		//place explosion
		this.$arena.append('<img id="expl' + tank.id + '" class="explosion" src="./img/explosion.gif">');
		$('#expl' + tank.id).css('left', (tank.x - 50)  + 'px');
		$('#expl' + tank.id).css('top', (tank.y - 100)  + 'px');

		setTimeout(function(){
			$('#expl' + tank.id).remove();
		}, 1000);

	},

	mainLoop: function(){
		if(this.localTank != undefined){
			//send data to server about local tank
			this.sendData();
			//move local tank
			this.localTank.move();
		}
	},

	sendData: function(){
		//Send local data to server
		var gameData = {};

		//Send tank data
		var t = {
			id: this.localTank.id,
			x: this.localTank.x,
			y: this.localTank.y,
			baseAngle: this.localTank.baseAngle,
			cannonAngle: this.localTank.cannonAngle
		};
		gameData.tank = t;
		//Client game does not send any info about balls,
		//the server controls that part
		this.socket.emit('sync', gameData);
	},

	receiveData: function(serverData){
		var game = this;

		serverData.tanks.forEach( function(serverTank){

			//Update local tank stats
			if(game.localTank !== undefined && serverTank.id == game.localTank.id){
				game.localTank.hp = serverTank.hp;
				if(game.localTank.hp <= 0){
					game.killTank(game.localTank);
				}
			}

			//Update foreign tanks
			var found = false;
			game.tanks.forEach( function(clientTank){
				//update foreign tanks
				if(clientTank.id === serverTank.id){
					clientTank.x = serverTank.x;
					clientTank.y = serverTank.y;
					clientTank.baseAngle = serverTank.baseAngle;
					clientTank.cannonAngle = serverTank.cannonAngle;
					clientTank.hp = serverTank.hp;
					if(clientTank.hp <= 0){
						game.killTank(clientTank);
					}
					clientTank.refresh();
					found = true;
				}
			});
			if(!found &&
				(game.localTank == undefined || serverTank.id != game.localTank.id)){
				//I need to create it
				game.addTank(serverTank.id, serverTank.name, serverTank.type, false, serverTank.x, serverTank.y, serverTank.hp);
			}
		});

		//Render balls
		game.$arena.find('.cannon-ball').remove();

		serverData.balls.forEach( function(serverBall){
			var b = new Ball(serverBall.id, serverBall.ownerId, game.$arena, serverBall.x, serverBall.y);
			b.exploding = serverBall.exploding;
			if(b.exploding){
				b.explode();
			}
		});
	}
}

function Ball(id, ownerId, $arena, x, y){
	this.id = id;
	this.ownerId = ownerId;
	this.$arena = $arena;
	this.x = x;
	this.y = y;

	this.materialize();
}

Ball.prototype = {

	materialize: function(){
		this.$arena.append('<div id="' + this.id + '" class="cannon-ball" style="left:' + this.x + 'px"></div>');
		this.$body = $('#' + this.id);
		this.$body.css('left', this.x + 'px');
		this.$body.css('top', this.y + 'px');
	},

	explode: function(){
		this.$arena.append('<div id="expl' + this.id + '" class="ball-explosion" style="left:' + this.x + 'px"></div>');
		var $expl = $('#expl' + this.id);
		$expl.css('left', this.x + 'px');
		$expl.css('top', this.y + 'px');
		setTimeout( function(){
			$expl.addClass('expand');
		}, 1);
		setTimeout( function(){
			$expl.remove();
		}, 1000);
	}

}

function Tank(id, name, type, $arena, game, isLocal, x, y, hp){
	this.id = id;
	this.name= name;
	this.type = type;
	this.speed = 5;
	this.$arena = $arena;
	this.w = 60;
	this.h = 80;
	this.baseAngle = getRandomInt(0, 360);
	//Make multiple of rotation amount
	this.baseAngle -= (this.baseAngle % ROTATION_SPEED);
	this.cannonAngle = 0;
	this.x = x;
	this.y = y;
	this.mx = null;
	this.my = null;
	this.dir = {
		up: false,
		down: false,
		left: false,
		right: false
	};
	this.game = game;
	this.isLocal = isLocal;
	this.hp = hp;
	this.dead = false;

	this.materialize();
}

Tank.prototype = {

	materialize: function(){
		this.$arena.append('<div id="' + this.id + '" class="tank tank' + this.type + '"></div>');
		this.$body = $('#' + this.id);
		this.$body.css('width', this.w);
		this.$body.css('height', this.h);

		this.$body.css('-webkit-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('-moz-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('-o-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('transform', 'rotateZ(' + this.baseAngle + 'deg)');

		this.$body.append('<div id="cannon-' + this.id + '" class="tank-cannon"></div>');
		this.$cannon = $('#cannon-' + this.id);

		this.$arena.append('<div id="info-' + this.id + '" class="info"></div>');
		this.$info = $('#info-' + this.id);
		this.$info.append('<div class="label">' + this.name + '</div>');
		this.$info.append('<div class="hp-bar"></div>');

		this.refresh();

		if(this.isLocal){
			this.setControls();
		}
	},

	isMoving: function(){
		return this.dir.up || this.dir.down || this.dir.left || this.dir.right;
	},

	refresh: function(){
		this.$body.css('left', this.x - 30 + 'px');
		this.$body.css('top', this.y - 40 + 'px');
		this.$body.css('-webkit-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('-moz-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('-o-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('transform', 'rotateZ(' + this.baseAngle + 'deg)');

		var cannonAbsAngle = this.cannonAngle - this.baseAngle;
		this.$cannon.css('-webkit-transform', 'rotateZ(' + cannonAbsAngle + 'deg)');
		this.$cannon.css('-moz-transform', 'rotateZ(' + cannonAbsAngle + 'deg)');
		this.$cannon.css('-o-transform', 'rotateZ(' + cannonAbsAngle + 'deg)');
		this.$cannon.css('transform', 'rotateZ(' + cannonAbsAngle + 'deg)');

		this.$info.css('left', (this.x) + 'px');
		this.$info.css('top', (this.y) + 'px');
		if(this.isMoving()){
			this.$info.addClass('fade');
		}else{
			this.$info.removeClass('fade');
		}

		this.$info.find('.hp-bar').css('width', this.hp + 'px');
		this.$info.find('.hp-bar').css('background-color', getGreenToRed(this.hp));
	},

	setControls: function(){
		var t = this;

		/* Detect both keypress and keyup to allow multiple keys
		 and combined directions */
		$(document).keypress( function(e){
			var k = e.keyCode || e.which;
			switch(k){
				case 119: //W
					t.dir.up = true;
					break;
				case 100: //D
					t.dir.right = true;
					break;
				case 115: //S
					t.dir.down = true;
					break;
				case 97: //A
					t.dir.left = true;
					break;
			}

		}).keyup( function(e){
			var k = e.keyCode || e.which;
			switch(k){
				case 87: //W
					t.dir.up = false;
					break;
				case 68: //D
					t.dir.right = false;
					break;
				case 83: //S
					t.dir.down = false;
					break;
				case 65: //A
					t.dir.left = false;
					break;
			}
		}).mousemove( function(e){ //Detect mouse for aiming
			t.mx = e.pageX - t.$arena.offset().left;
			t.my = e.pageY - t.$arena.offset().top;
			t.setCannonAngle();
		}).click( function(){
			t.shoot();
		});

	},

	move: function(){
		if(this.dead){
			return;
		}

		var moveX = 0;
		var moveY = 0;

		if (this.dir.up) {
			moveY = -1;
		} else if (this.dir.down) {
			moveY = 1;
		}
		if (this.dir.left) {
			moveX = -1;
		} else if (this.dir.right) {
			moveX = 1;
		}

		moveX = this.speed * moveX;
		moveY = this.speed * moveY;

		if(this.x + moveX > (0 + ARENA_MARGIN) && (this.x + moveX) < (this.$arena.width() - ARENA_MARGIN)){
			this.x += moveX;
		}
		if(this.y + moveY > (0 + ARENA_MARGIN) && (this.y + moveY) < (this.$arena.height() - ARENA_MARGIN)){
			this.y += moveY;
		}
		this.rotateBase();
		this.setCannonAngle();
		this.refresh();
	},

	/* Rotate base of tank to match movement direction */
	rotateBase: function(){
		if((this.dir.up && this.dir.left)
			|| (this.dir.down && this.dir.right)){ //diagonal "left"
			this.setDiagonalLeft();
		}else if((this.dir.up && this.dir.right)
			|| (this.dir.down && this.dir.left)){ //diagonal "right"
			this.setDiagonalRight();
		}else if(this.dir.up || this.dir.down){ //vertical
			this.setVertical();
		}else if(this.dir.left || this.dir.right){  //horizontal
			this.setHorizontal();
		}

	},

	/* Rotate base until it is vertical */
	setVertical: function(){
		var a = this.baseAngle;
		if(a != 0 && a != 180){
			if(a < 90 || (a > 180 && a < 270)){
				this.decreaseBaseRotation();
			}else{
				this.increaseBaseRotation();
			}
		}
	},

	/* Rotate base until it is horizontal */
	setHorizontal: function(){
		var a = this.baseAngle;
		if(a != 90 && a != 270){
			if(a < 90 || (a > 180 && a < 270)){
				this.increaseBaseRotation();
			}else{
				this.decreaseBaseRotation();
			}
		}
	},

	setDiagonalLeft: function(){
		var a = this.baseAngle;
		if(a != 135 && a != 315){
			if(a < 135 || (a > 225 && a < 315)){
				this.increaseBaseRotation();
			}else{
				this.decreaseBaseRotation();
			}
		}
	},

	setDiagonalRight: function(){
		var a = this.baseAngle;
		if(a != 45 && a != 225){
			if(a < 45 || (a > 135 && a < 225)){
				this.increaseBaseRotation();
			}else{
				this.decreaseBaseRotation();
			}
		}
	},

	increaseBaseRotation: function(){
		this.baseAngle += ROTATION_SPEED;
		if(this.baseAngle >= 360){
			this.baseAngle = 0;
		}
	},

	decreaseBaseRotation: function(){
		this.baseAngle -= ROTATION_SPEED;
		if(this.baseAngle < 0){
			this.baseAngle = 0;
		}
	},

	setCannonAngle: function(){
		var tank = { x: this.x , y: this.y};
		var deltaX = this.mx - tank.x;
		var deltaY = this.my - tank.y;
		this.cannonAngle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
		this.cannonAngle += 90;
	},

	shoot: function(){
		if(this.dead){
			return;
		}

		//Emit ball to server
		var serverBall = {};
		//Just for local balls who have owner
		serverBall.alpha = this.cannonAngle * Math.PI / 180; //angle of shot in radians
		//Set init position
		var cannonLength = 60;
		var deltaX = cannonLength * Math.sin(serverBall.alpha);
		var deltaY = cannonLength * Math.cos(serverBall.alpha);

		serverBall.ownerId = this.id;
		serverBall.x = this.x + deltaX - 5;
		serverBall.y = this.y - deltaY - 5;

		this.game.socket.emit('shoot', serverBall);
	}

}

function debug(msg){
	if(DEBUG){
		console.log(msg);
	}
}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}

function getGreenToRed(percent){
	r = percent<50 ? 255 : Math.floor(255-(percent*2-100)*255/100);
	g = percent>50 ? 255 : Math.floor((percent*2)*255/100);
	return 'rgb('+r+','+g+',0)';
}
