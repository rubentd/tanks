var DEBUG = true;
var INTERVAL = 50;
var ROTATION_SPEED = 5;
var BALL_SPEED = 10;
var ARENA_MARGIN = 30;

function Game(arenaId, w, h, socket){
	this.tanks = []; //Tanks (other than the local tank)
	this.balls = []; //Balls (others than the local balls)
	this.localBalls = [];
	this.lastBallId = 0;
	this.width = w;
	this.height = h;
	this.$arena = $(arenaId);
	this.$arena.css('width', w);
	this.$arena.css('height', h);
	this.hp = 100;
	this.socket = socket;

	var g = this;
	setInterval(function(){
		g.mainLoop();
	}, INTERVAL);
}

Game.prototype = {

	addTank: function(id, type, isLocal){
		var t = new Tank(id, type, this.$arena, this, isLocal);
		if(isLocal){
			this.localTank = t;
		}else{
			this.tanks.push(t);
		}
	},

	addBall: function(id, owner){
		var b = new Ball(id, owner, this.$arena);
		this.balls.push(b);
		if(owner.id == this.localTank.id){ //I need to know if that ball was shot by the local tank
			this.localBalls.push(b);
		}
	},

	mainLoop: function(){
		this.sync();

		//move local tank
		if(this.localTank != undefined){
			this.localTank.move();
		}
		//Move local balls
		this.localBalls.forEach( function(ball){
			ball.fly();
		});
		this.localBalls = this.localBalls.filter( function(b){return !b.isOutOfBounds} );

		//move external elements ----------
		this.tanks.forEach( function(tank){
			tank.fly();
		});
		//Move local balls
		this.balls.forEach( function(ball){
			ball.fly();
		});
		this.balls = this.balls.filter( function(b){return !b.isOutOfBounds} );

	},

	increaseLastBallId: function(){
		this.lastBallId ++;
		if(this.lastBallId > 1000){
			this.lastBallId = 0;
		}
	},

	//Sync data with server
	sync: function(serverGame){
		
	}

}

function Ball(id, owner, $arena){
	this.id = id;
	this.owner = owner;
	this.$arena = $arena;
	this.alpha = this.owner.cannonAngle * Math.PI / 180; //angle of shot in radians

	//Set init position
	var cannonLength = 60;
	var deltaX = cannonLength * Math.sin(this.alpha);
	var deltaY = cannonLength * Math.cos(this.alpha);
	this.x = owner.x + deltaX - 5;
	this.y = owner.y - deltaY - 5;

	this.materialize();
}

Ball.prototype = {

	materialize: function(){
		this.isOutOfBounds = false;
		this.$arena.append('<div id="' + this.id + '" class="cannon-ball"></div>');
		this.$body = $('#' + this.id);
		this.$body.css('left', this.x + 'px');
		this.$body.css('top', this.y + 'px');
	},

	fly: function(){
		//move to trayectory
		var speedX = BALL_SPEED * Math.sin(this.alpha);
		var speedY = -BALL_SPEED * Math.cos(this.alpha);
		this.x += speedX;
		this.y += speedY;
		this.refresh();
	},

	refresh: function(){
		this.$body.css('left', this.x + 'px');
		this.$body.css('top', this.y + 'px');

		//Delete if out of bounds
		if(this.y > this.$arena.height() || 
			this.x > this.$arena.width() || 
				this.x < 0 || this.y < 0){

			this.isOutOfBounds = true;
			this.$body.remove();

		}
	}

}

function Tank(id, type, $arena, game, isLocal){
	this.id = id;
	this.type = type;
	this.speed = 5;
	this.$arena = $arena;
	this.w = 60;
	this.h = 80;
	this.baseAngle = getRandomInt(0, 360);
	//Make multiple of rotation amount
	this.baseAngle -= (this.baseAngle % ROTATION_SPEED);
	this.cannonAngle = 0;
	this.x = getRandomInt(0 + this.w, $arena.width() - this.w);
	this.y = getRandomInt(0 + this.h, $arena.height() - this.h);
	this.dir = [0, 0, 0, 0];
	this.game = game;
	this.isLocal = isLocal;

	this.materialize();
}

Tank.prototype = {
	
	materialize: function(){
		this.$arena.append('<div id="' + this.id + '" class="tank tank' + this.type + '"></div>');
		this.$body = $('#' + this.id);
		this.$body.css('width', this.w);
		this.$body.css('height', this.h);
		this.$body.css('-webkit-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.append('<div id="cannon-' + this.id + '" class="tank-cannon"></div>');
		this.$cannon = $('#cannon-' + this.id);
		
		this.$arena.append('<div id="info-' + this.id + '" class="info"></div>');
		this.$info = $('#info-' + this.id);
		this.$info.append('<div class="label">' + this.id + '</div>');
		this.$info.append('<div class="hp-bar"></div>');

		this.refresh();

		if(this.isLocal){
			this.setControls();
		}
	},

	isMoving: function(){
		if(this.dir[0] != 0 || this.dir[1] != 0){
			return true;
		}
		return false;
	},

	refresh: function(){
		this.$body.css('left', this.x - 30 + 'px');
		this.$body.css('top', this.y - 40 + 'px');
		this.$body.css('-webkit-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		var cannonAbsAngle = this.cannonAngle - this.baseAngle;
		this.$cannon.css('-webkit-transform', 'rotateZ(' + cannonAbsAngle + 'deg)');

		this.$info.css('left', (this.x) + 'px');
		this.$info.css('top', (this.y) + 'px');
		if(this.isMoving()){
			this.$info.addClass('fade');
		}else{
			this.$info.removeClass('fade');
		}

		this.$info.find('.hp-bar').css('width', this.hp + 'px');
	},

	setControls: function(){
		var t = this;

		/* Detect both keypress and keyup to allow multiple keys
		 and combined directions */
		$(document).keypress( function(e){
			var k = e.keyCode || e.which;
			switch(k){
				case 119: //W
					t.dir[1] = -1;
					break;
				case 100: //D
					t.dir[0] = 1;
					break;
				case 115: //S
					t.dir[1] = 1;
					break;
				case 97: //A
					t.dir[0] = -1;
					break;
			}
			
		}).keyup( function(e){
			var k = e.keyCode || e.which;
			switch(k){
				case 87: //W
					t.dir[1] = 0;
					break;
				case 68: //D
					t.dir[0] = 0;
					break;
				case 83: //S
					t.dir[1] = 0;
					break;
				case 65: //A
					t.dir[0] = 0;
					break;
			}
		}).mousemove( function(e){ //Detect mouse for aiming
			var mx = event.pageX - t.$arena.offset().left;
			var my = event.pageY - t.$arena.offset().top;
			t.setCannonAngle(mx, my);
		}).click( function(){
			t.shoot();
		});

	},

	move: function(){
		var moveX = this.speed * this.dir[0];
		var moveY = this.speed * this.dir[1]
		if(this.x + moveX > (0 + ARENA_MARGIN) && (this.x + moveX) < (this.$arena.width() - ARENA_MARGIN)){
			this.x += moveX;
		}
		if(this.y + moveY > (0 + ARENA_MARGIN) && (this.y + moveY) < (this.$arena.height() - ARENA_MARGIN)){
			this.y += moveY;
		}
		this.rotateBase();
		this.refresh();
	},

	/* Rotate base of tank to match movement direction */
	rotateBase: function(){
		if((this.dir[0] == 1 && this.dir[1] == 1) 
			|| (this.dir[0] == -1 && this.dir[1] == -1)){ //diagonal "left"
			this.setDiagonalLeft();
		}else if((this.dir[0] == 1 && this.dir[1] == -1) 
			|| (this.dir[0] == -1 && this.dir[1] == 1)){ //diagonal "right"
			this.setDiagonalRight();
		}else if(this.dir[1] == 1 || this.dir[1] == -1){ //vertical
			this.setVertical();
		}else if(this.dir[0] == 1 || this.dir[0] == -1){  //horizontal
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

	setCannonAngle: function(mx, my){
		var tank = { x: this.x , y: this.y};
		var mouse = { x: mx, y: my};
		var deltaX = mouse.x - tank.x;
		var deltaY = mouse.y - tank.y;
		this.cannonAngle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
		this.cannonAngle += 90;
	},

	shoot: function(){
		var ballId = 'ball-' + this.game.lastBallId;
		this.game.increaseLastBallId();
		this.game.addBall(ballId, this);
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
