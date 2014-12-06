"use strict";

var Splat = require("splatjs");
var canvas = document.getElementById("canvas");

var manifest = require("./manifest.json");

var game = new Splat.Game(canvas, manifest);

function moveEntity(entity, up, down, left, right, accel, maxV) {
	var xPressed = left || right;
	var yPressed = up || down;

	if (up) {
		entity.vy -= accel;
		if (!xPressed) {
			entity.direction = "up";
			entity.sprite = entity.walkUp;
		}
	}
	if (down) {
		entity.vy += accel;
		if (!xPressed) {
			entity.direction = "down";
			entity.sprite = entity.walkDown;
		}
	}
	if (!yPressed) {
		if (entity.vy < 0) {
			entity.vy = Math.min(entity.vy + accel, 0);
		} else if (entity.vy > 0) {
			entity.vy = Math.max(entity.vy - accel, 0);
		}
	}

	entity.vy = Math.min(maxV, Math.max(-maxV, entity.vy));

	if (left) {
		entity.vx -= accel;
		if (!yPressed) {
			entity.direction = "left";
			entity.sprite = entity.walkLeft;
		}
	}
	if (right) {
		entity.vx += accel;
		if (!yPressed) {
			entity.direction = "right";
			entity.sprite = entity.walkRight;
		}
	}
	if (!xPressed) {
		if (entity.vx < 0) {
			entity.vx = Math.min(entity.vx + accel, 0);
		} else if (entity.vx > 0) {
			entity.vx = Math.max(entity.vx - accel, 0);
		}
	}

	entity.vx = Math.min(maxV, Math.max(-maxV, entity.vx));

	if (entity.vx === 0 && entity.vy === 0) {
		entity.sprite.reset();
	}
}

function movePlayer(player) {
	moveEntity(player, game.keyboard.isPressed("w"), game.keyboard.isPressed("s"), game.keyboard.isPressed("a"), game.keyboard.isPressed("d"), 0.03, 0.8);
}

function moveSword(player, sword, timer) {
	if (game.keyboard.consumePressed("j")) {
		timer.reset();
		timer.start();
		sword.sprite.reset();
		game.sounds.play("sword");
	}
	sword.visible = timer.running;
	if (player.direction === "up") {
		sword.x = player.x;
		sword.y = player.y - sword.height;
		sword.sprite = sword.up;
	}
	if (player.direction === "down") {
		sword.x = player.x;
		sword.y = player.y + player.height;
		sword.sprite = sword.down;
	}
	if (player.direction === "left") {
		sword.x = player.x - sword.width;
		sword.y = player.y - (sword.height / 2);
		sword.sprite = sword.left;
	}
	if (player.direction === "right") {
		sword.x = player.x + player.width;
		sword.y = player.y - (sword.height / 2);
		sword.sprite = sword.right;
	}
}

var debug = false;

function makePot(x, y) {
	var anim = game.animations.get("pot").copy();
	var pot = new Splat.AnimatedEntity(x, y, 56, 56, anim, -28, -13);
	pot.exploding = false;
	pot.explodeTime = 0;
	pot.move = function(elapsedMillis) {
		if (!this.exploding) {
			return;
		}
		this.explodeTime += elapsedMillis;
		Splat.AnimatedEntity.prototype.move.call(this, elapsedMillis);
		if (this.explodeTime > this.sprite.frames.length * this.sprite.frames[0].time) {
			this.dead = true;
		}
	};
	return pot;
}

function makeTurtle(x, y) {
	var anim = game.animations.get("cake-turtle-left").copy();
	var turtle = new Splat.AnimatedEntity(x, y, 74, 74, anim, -25, -4);
	turtle.walkLeft = anim;
	turtle.walkRight = game.animations.get("cake-turtle-right").copy();
	turtle.direction = "left";
	turtle.move = function(elapsedMillis) {
		if (this.direction === "left" && this.x < 200) {
			this.direction = "right";
		}
		if (this.direction === "right" && this.x > 800) {
			this.direction = "left";
		}
		moveEntity(this, false, false, this.direction === "left", this.direction === "right", 0.01, 0.6);
		Splat.AnimatedEntity.prototype.move.call(this, elapsedMillis);
		if (this.exploding) {
			this.dead = true;
		}
	};
	return turtle;
}

game.scenes.add("title", new Splat.Scene(canvas, function() {
	// initialization
	var playerWalkDown = game.animations.get("player-walk-down");
	this.player = new Splat.AnimatedEntity(300, 300, 74, 74, playerWalkDown, -13, -63);
	this.player.walkUp = game.animations.get("player-walk-up");
	this.player.walkDown = playerWalkDown;
	this.player.walkLeft = game.animations.get("player-walk-left");
	this.player.walkRight = game.animations.get("player-walk-right");
	this.player.direction = "down";

	var swordDown = game.animations.get("player-sword-down");
	this.sword = new Splat.AnimatedEntity(0, 0, swordDown.width, swordDown.height, swordDown, 0, 0);
	this.sword.up = game.animations.get("player-sword-up");
	this.sword.down = swordDown;
	this.sword.left = game.animations.get("player-sword-left");
	this.sword.right = game.animations.get("player-sword-right");
	this.sword.visible = false;
	this.sword.draw = function(context) {
		if (!this.visible) {
			return;
		}
		Splat.AnimatedEntity.prototype.draw.call(this, context);
	};
	var sword = this.sword;
	this.timers.sword = new Splat.Timer(function(elapsedMillis) {
		if (this.time < this.expireMillis / 2 && game.keyboard.consumePressed("j")) {
			this.interrupted = true;
		}
		sword.up.move(elapsedMillis);
		sword.down.move(elapsedMillis);
		sword.left.move(elapsedMillis);
		sword.right.move(elapsedMillis);
		if (this.interrupted && this.time >= this.expireMillis / 2) {
			game.sounds.play("sword");
			this.reset();
			this.interrupted = false;
			sword.up.reset();
			sword.down.reset();
			sword.left.reset();
			sword.right.reset();
		}
	}, 250, function() {
		this.interrupted = false;
		this.reset();
		sword.up.reset();
		sword.down.reset();
		sword.left.reset();
		sword.right.reset();
	});
	this.timers.sword.interrupted = false;

	this.solid = [];
	this.solid.push(makePot(600, 300));
	this.solid.push(makePot(100, 100));
	this.solid.push(makePot(100, 400));
	this.solid.push(makeTurtle(800, 100));
	this.ghosts = [];
}, function(elapsedMillis) {
	// simulation

	if (game.keyboard.consumePressed("f2")) {
		debug = !debug;
	}
	movePlayer(this.player);
	moveSword(this.player, this.sword, this.timers.sword);
	this.player.move(elapsedMillis);
	this.player.solveCollisions(this.solid, []);

	for (var i = 0; i < this.solid.length; i++) {
		this.solid[i].move(elapsedMillis);
		if (this.timers.sword.time > 120 && this.sword.collides(this.solid[i]) && !this.solid[i].exploding) {
			var hit = this.solid.splice(i, 1)[0];
			hit.exploding = true;
			i--;
			if (this.player.direction === "up") {
				hit.vy -= 1;
			}
			if (this.player.direction === "down") {
				hit.vy += 1;
			}
			if (this.player.direction === "left") {
				hit.vx -= 1;
			}
			if (this.player.direction === "right") {
				hit.vx += 1;
			}
			this.ghosts.push(hit);

			game.sounds.play("pot-breaking");
		}
	}
	for (i = 0; i < this.ghosts.length; i++) {
		this.ghosts[i].move(elapsedMillis);
		if (this.ghosts[i].dead) {
			this.ghosts.splice(i, 1);
			i--;
		}
	}
}, function(context) {
	// draw
	context.fillStyle = "#000000";
	context.fillRect(0, 0, canvas.width, canvas.height);

	this.player.draw(context);
	outline(context, this.player, "red");
	this.sword.draw(context);
	if (this.sword.visible) {
		outline(context, this.sword, "green");
	}

	for (var i = 0; i < this.solid.length; i++) {
		this.solid[i].draw(context);
	}
	for (i = 0; i < this.ghosts.length; i++) {
		this.ghosts[i].draw(context);
	}
	outline(context, this.pot, "yellow");
}));

function outline(context, entity, color) {
	if (!debug) {
		return;
	}
	context.strokeStyle = color;
	context.strokeRect(entity.x, entity.y, entity.width, entity.height);
}

game.scenes.switchTo("loading");
