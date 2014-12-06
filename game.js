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
	}
	if (game.keyboard.isPressed("s")) {
		player.vy += accel;
		xPressed = true;
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
	}
	if (game.keyboard.isPressed("d")) {
		player.vx += accel;
		yPressed = true;
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

game.scenes.add("title", new Splat.Scene(canvas, function() {
	// initialization
	this.player = new Splat.Entity(50, 50, 50, 50);
	this.player.draw = function(context) {
		context.fillStyle = "red";
		context.fillRect(this.x, this.y, this.width, this.height);
	};
}, function(elapsedMillis) {
	// simulation

	movePlayer(this.player);
	this.player.move(elapsedMillis);
}, function(context) {
	// draw
	context.fillStyle = "#000000";
	context.fillRect(0, 0, canvas.width, canvas.height);

	this.player.draw(context);
}));

game.scenes.switchTo("loading");
