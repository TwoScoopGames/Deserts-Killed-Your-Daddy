"use strict";

var Splat = require("splatjs");
var canvas = document.getElementById("canvas");

var manifest = require("./manifest.json");

var game = new Splat.Game(canvas, manifest);

function movePlayer(player) {
	var accel = 0.03;
	var maxV = 0.8;
	var xPressed = false;
	var yPressed = false;

	if (game.keyboard.isPressed("w")) {
		player.vy -= accel;
		xPressed = true;
		player.swordDirection = "up";
	}
	if (game.keyboard.isPressed("s")) {
		player.vy += accel;
		xPressed = true;
		player.swordDirection = "down";
	}
	if (!xPressed) {
		if (player.vy < 0) {
			player.vy = Math.min(player.vy + accel, 0);
		} else if (player.vy > 0) {
			player.vy = Math.max(player.vy - accel, 0);
		}
	}

	player.vy = Math.min(maxV, Math.max(-maxV, player.vy));

	if (game.keyboard.isPressed("a")) {
		player.vx -= accel;
		yPressed = true;
		player.swordDirection = "left";
	}
	if (game.keyboard.isPressed("d")) {
		player.vx += accel;
		yPressed = true;
		player.swordDirection = "right";
	}
	if (!yPressed) {
		if (player.vx < 0) {
			player.vx = Math.min(player.vx + accel, 0);
		} else if (player.vx > 0) {
			player.vx = Math.max(player.vx - accel, 0);
		}
	}

	player.vx = Math.min(maxV, Math.max(-maxV, player.vx));
}

function moveSword(player, sword) {
	sword.visible = game.keyboard.isPressed("j");
	if (player.swordDirection === "up") {
		sword.x = player.x;
		sword.y = player.y - sword.height;
	}
	if (player.swordDirection === "down") {
		sword.x = player.x;
		sword.y = player.y + player.height;
	}
	if (player.swordDirection === "left") {
		sword.x = player.x - sword.width;
		sword.y = player.y;
	}
	if (player.swordDirection === "right") {
		sword.x = player.x + player.width;
		sword.y = player.y;
	}
}

game.scenes.add("title", new Splat.Scene(canvas, function() {
	// initialization
	this.player = new Splat.Entity(50, 50, 50, 50);
	this.player.draw = function(context) {
		context.fillStyle = "red";
		context.fillRect(this.x, this.y, this.width, this.height);
	};
	this.sword = new Splat.Entity(50, 50, 50, 50);
	this.sword.visible = false;
	this.sword.draw = function(context) {
		if (!this.visible) {
			return;
		}
		context.fillStyle = "white";
		context.fillRect(this.x, this.y, this.width, this.height);
	};
}, function(elapsedMillis) {
	// simulation

	movePlayer(this.player);
	moveSword(this.player, this.sword);
	this.player.move(elapsedMillis);
}, function(context) {
	// draw
	context.fillStyle = "#000000";
	context.fillRect(0, 0, canvas.width, canvas.height);

	this.player.draw(context);
	this.sword.draw(context);
}));

game.scenes.switchTo("loading");
