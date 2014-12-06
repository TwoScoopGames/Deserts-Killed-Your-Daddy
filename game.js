"use strict";

var Splat = require("splatjs");
var canvas = document.getElementById("canvas");

var manifest = require("./manifest.json");

var game = new Splat.Game(canvas, manifest);

function movePlayer(player) {
	var accel = 0.03;
	var maxV = 0.8;
	var xPressed = game.keyboard.isPressed("a") || game.keyboard.isPressed("d");
	var yPressed = game.keyboard.isPressed("w") || game.keyboard.isPressed("s");

	if (game.keyboard.isPressed("w")) {
		player.vy -= accel;
		if (!xPressed) {
			player.swordDirection = "up";
			player.sprite = player.walkUp;
		}
	}
	if (game.keyboard.isPressed("s")) {
		player.vy += accel;
		if (!xPressed) {
			player.swordDirection = "down";
			player.sprite = player.walkDown;
		}
	}
	if (!yPressed) {
		if (player.vy < 0) {
			player.vy = Math.min(player.vy + accel, 0);
		} else if (player.vy > 0) {
			player.vy = Math.max(player.vy - accel, 0);
		}
	}

	player.vy = Math.min(maxV, Math.max(-maxV, player.vy));

	if (game.keyboard.isPressed("a")) {
		player.vx -= accel;
		if (!yPressed) {
			player.swordDirection = "left";
			player.sprite = player.walkLeft;
		}
	}
	if (game.keyboard.isPressed("d")) {
		player.vx += accel;
		if (!yPressed) {
			player.swordDirection = "right";
			player.sprite = player.walkRight;
		}
	}
	if (!xPressed) {
		if (player.vx < 0) {
			player.vx = Math.min(player.vx + accel, 0);
		} else if (player.vx > 0) {
			player.vx = Math.max(player.vx - accel, 0);
		}
	}

	player.vx = Math.min(maxV, Math.max(-maxV, player.vx));

	if (player.vx === 0 && player.vy === 0) {
		player.sprite.reset();
	}
}

function moveSword(player, sword, timer) {
	if (game.keyboard.consumePressed("j")) {
		timer.reset();
		timer.start();
		sword.sprite.reset();
		game.sounds.play("sword");
	}
	sword.visible = timer.running;
	if (player.swordDirection === "up") {
		sword.x = player.x;
		sword.y = player.y - sword.height;
		sword.sprite = sword.up;
	}
	if (player.swordDirection === "down") {
		sword.x = player.x;
		sword.y = player.y + player.height;
		sword.sprite = sword.down;
	}
	if (player.swordDirection === "left") {
		sword.x = player.x - sword.width;
		sword.y = player.y;
		sword.sprite = sword.left;
	}
	if (player.swordDirection === "right") {
		sword.x = player.x + player.width;
		sword.y = player.y;
		sword.sprite = sword.right;
	}
}

var debug = false;

game.scenes.add("title", new Splat.Scene(canvas, function() {
	// initialization
	var playerWalkDown = game.animations.get("player-walk-down");
	this.player = new Splat.AnimatedEntity(300, 300, 74, 74, playerWalkDown, -13, -63);
	this.player.walkUp = game.animations.get("player-walk-up");
	this.player.walkDown = playerWalkDown;
	this.player.walkLeft = game.animations.get("player-walk-left");
	this.player.walkRight = game.animations.get("player-walk-right");

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

	var pot = game.animations.get("pot");
	var potTimer = this.timers.pot = new Splat.Timer(undefined, pot.frames.length * pot.frames[0].time, function() {
		pot.reset();
	});
	this.pot = new Splat.AnimatedEntity(600, 300, 56, 56, pot, -28, -13);
	this.pot.move = function(elapsedMillis) {
		if (!potTimer.running) {
			return;
		}
		Splat.AnimatedEntity.prototype.move.call(this, elapsedMillis);
	};
}, function(elapsedMillis) {
	// simulation

	if (game.keyboard.consumePressed("f2")) {
		debug = !debug;
	}
	movePlayer(this.player);
	moveSword(this.player, this.sword, this.timers.sword);
	this.player.move(elapsedMillis);
	this.player.solveCollisions([this.pot], []);
	this.pot.move(elapsedMillis);
	if (this.timers.sword.time > 120 && this.sword.collides(this.pot) && !this.timers.pot.running) {
		this.timers.pot.reset();
		this.timers.pot.start();
		game.sounds.play("pot-breaking");
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
	this.pot.draw(context);
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
