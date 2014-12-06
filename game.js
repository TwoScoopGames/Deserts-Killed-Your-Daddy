"use strict";

var Splat = require("splatjs");
var canvas = document.getElementById("canvas");

var manifest = require("./manifest.json");

var game = new Splat.Game(canvas, manifest);

game.scenes.add("title", new Splat.Scene(canvas, function() {
	// initialization
	this.player = new Splat.Entity(50, 50, 50, 50);
	this.player.draw = function(context) {
		context.fillStyle = "red";
		context.fillRect(this.x, this.y, this.width, this.height);
	};
}, function(elapsedMillis) {
	// simulation
	var accel = 0.03;
	var maxV = 0.8;
	var xPressed = false;
	var yPressed = false;

	if (game.keyboard.isPressed("w")) {
		this.player.vy -= accel;
		xPressed = true;
	}
	if (game.keyboard.isPressed("s")) {
		this.player.vy += accel;
		xPressed = true;
	}
	if (!xPressed) {
		if (this.player.vy < 0) {
			this.player.vy = Math.min(this.player.vy + accel, 0);
		} else if (this.player.vy > 0) {
			this.player.vy = Math.max(this.player.vy - accel, 0);
		}
	}

	this.player.vy = Math.min(maxV, Math.max(-maxV, this.player.vy));

	if (game.keyboard.isPressed("a")) {
		this.player.vx -= accel;
		yPressed = true;
	}
	if (game.keyboard.isPressed("d")) {
		this.player.vx += accel;
		yPressed = true;
	}
	if (!yPressed) {
		if (this.player.vx < 0) {
			this.player.vx = Math.min(this.player.vx + accel, 0);
		} else if (this.player.vx > 0) {
			this.player.vx = Math.max(this.player.vx - accel, 0);
		}
	}

	this.player.vx = Math.min(maxV, Math.max(-maxV, this.player.vx));

	this.player.move(elapsedMillis);
}, function(context) {
	// draw
	context.fillStyle = "#000000";
	context.fillRect(0, 0, canvas.width, canvas.height);

	this.player.draw(context);
}));

game.scenes.switchTo("loading");
