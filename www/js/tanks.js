var DEBUG = true;
var INTERVAL = 50;
var ROTATION_SPEED = 5;

function Game(arenaId, w, h){
	this.tanks = [];
	this.width = w;
	this.height = h;
	this.$arena = $(arenaId);
	this.$arena.css('width', w);
	this.$arena.css('height', h);

	var g = this;
	setInterval(function(){
		g.mainLoop();
	}, INTERVAL);
}

Game.prototype = {

	addTank: function(id, type){
		var t = new Tank(id, type, this.$arena);
		this.tanks.push(t);
		debug('tank ' + id + ' added');
	},

	mainLoop: function(){
		this.tanks.forEach( function(tank){
			tank.move();
		})
	}

}

function Tank(id, type, $arena){
	this.id = id;
	this.type = type;
	this.speed = 5;
	var skin = 'img/tank-' + type + '-base.png';
	this.skin = skin;
	this.$arena = $arena;
	this.w = 60;
	this.h = 80;
	this.baseAlpha = getRandomInt(0, 360);
	this.x = getRandomInt(0 + this.w, $arena.width() - this.w);
	this.y = getRandomInt(0 + this.h, $arena.height() - this.h);
	this.dir = [0, 0, 0, 0];

	this.materialize();
}

Tank.prototype = {
	
	materialize: function(){
		this.$arena.append('<div id="' + this.id + '" class="tank"></div>');
		this.$body = $('#' + this.id);
		this.$body.css('width', this.w);
		this.$body.css('height', this.h);
		this.$body.css('-webkit-transform', 'rotateZ(' + this.baseAlpha + 'deg)');
		this.refresh();
		this.setControls();
	},

	refresh: function(){
		this.$body.css('left', this.x);
		this.$body.css('top', this.y);
		this.$body.css('-webkit-transform', 'rotateZ(' + this.baseAlpha + 'deg)');
	},

	setControls: function(){
		var t = this;

		$(document).keypress( function(e){
			var k = e.keyCode || e.which;
			switch(k){
				case 119:
					t.dir[1] = -1;
					break;
				case 100:
					t.dir[0] = 1;
					break;
				case 115:
					t.dir[1] = 1;
					break;
				case 97:
					t.dir[0] = -1;
					break;
			}
			
		}).keyup( function(e){
			var k = e.keyCode || e.which;
			switch(k){
				case 87:
					t.dir[1] = 0;
					break;
				case 68:
					t.dir[0] = 0;
					break;
				case 83:
					t.dir[1] = 0;
					break;
				case 65:
					t.dir[0] = 0;
					break;
			}
			
		});

	},

	move: function(){
		this.x += this.speed * this.dir[0];
		this.y += this.speed * this.dir[1];
		this.rotateBase();
		this.refresh();
	},

	rotateBase: function(){
		//vertical
		if((this.dir[1] == 1 || this.dir[1] == -1)
			&& (this.baseAlpha != 0 ||  this.baseAlpha != 360)){ //Looking up
			
			if(this.baseAlpha > 0 && this.baseAlpha <= 90 ||
				this.baseAlpha > 180 && this.baseAlpha <= 270){

				this.baseAlpha -= ROTATION_SPEED;
			}else if(this.baseAlpha > 90 && this.baseAlpha < 180
				|| this.baseAlpha > 270 && this.baseAlpha < 360){

				this.baseAlpha += ROTATION_SPEED;
			}

		}

		//horizontal
		if((this.dir[0] == 1 || this.dir[0] == -1)
			&& (this.baseAlpha != 90 ||  this.baseAlpha != 270)){ //Looking up
			
			this.baseAlpha -= ROTATION_SPEED;

		}
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