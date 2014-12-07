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

function moveSword(player, timer) {
	if (game.keyboard.consumePressed("j")) {
		timer.reset();
		timer.start();
		game.sounds.play("sword");
	}
	player.swordVisible = timer.running;
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

function makeStove(x, y) {
	var anim = game.animations.get("stove").copy();
	var stove = new Splat.AnimatedEntity(x, y, 148, 148, anim, 0, 0);
	return stove;
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
		// if (this.exploding) {
		// 	this.dead = true;
		// }
	};
	return turtle;
}

function moveRelativeTo(target, xOffset, yOffset) {
	return function(elapsedMillis) {
		this.x = target.x + xOffset;
		this.y = target.y + yOffset;
		Splat.AnimatedEntity.prototype.move.call(this, elapsedMillis);
	};
}

function makeSwordDraw(player, direction) {
	return function(context) {
		if (!player.swordVisible || player.direction !== direction) {
			return;
		}
		Splat.AnimatedEntity.prototype.draw.call(this, context);
	};
}
game.scenes.add("title", new Splat.Scene(canvas, function() {
	// initialization
	this.timers.expire = new Splat.Timer(undefined, 2000, function() {
		game.scenes.switchTo("main");
	});
	this.timers.expire.start();
}, function() {
	// simulation
}, function(context) {
	// draw
	context.fillStyle = "black";
	context.fillRect(0, 0, canvas.width, canvas.height);

	context.fillStyle = "#fff";
	context.font = "25px helvetica";
	centerText(context, "DESSERTS KILLED YOUR DADDY", 0, canvas.height / 2 - 13);
}));

game.scenes.add("main", new Splat.Scene(canvas, function() {
	// initialization
	var playerWalkDown = game.animations.get("player-walk-down");
	this.player = new Splat.AnimatedEntity(300, 300, 74, 74, playerWalkDown, -13, -63);
	this.player.walkUp = game.animations.get("player-walk-up");
	this.player.walkDown = playerWalkDown;
	this.player.walkLeft = game.animations.get("player-walk-left");
	this.player.walkRight = game.animations.get("player-walk-right");
	this.player.direction = "down";

	var swordUp = game.animations.get("player-sword-up");
	var swordDown = game.animations.get("player-sword-down");
	var swordLeft = game.animations.get("player-sword-left");
	var swordRight = game.animations.get("player-sword-right");

	this.swordUp = new Splat.AnimatedEntity(0, 0, swordUp.width, swordUp.height, swordUp, 0, 0);
	this.swordUp.move = moveRelativeTo(this.player, -swordUp.width / 2, -swordUp.height);
	this.swordUp.draw = makeSwordDraw(this.player, "up");

	this.swordDown = new Splat.AnimatedEntity(0, 0, swordDown.width, swordDown.height, swordDown, 0, 0);
	this.swordDown.move = moveRelativeTo(this.player, -swordDown.width / 2, this.player.height);
	this.swordDown.draw = makeSwordDraw(this.player, "down");

	this.swordLeft = new Splat.AnimatedEntity(0, 0, swordLeft.width, swordLeft.height, swordLeft, 0, 0);
	this.swordLeft.move = moveRelativeTo(this.player, -swordLeft.width, -swordLeft.height / 2);
	this.swordLeft.draw = makeSwordDraw(this.player, "left");

	this.swordRight = new Splat.AnimatedEntity(0, 0, swordRight.width - 30, swordRight.height - 48, swordRight, 0, -24);
	this.swordRight.move = moveRelativeTo(this.player, this.player.width, -swordLeft.height / 2);
	this.swordRight.draw = makeSwordDraw(this.player, "right");

	this.swordVisible = false;
	var scene = this;
	this.timers.sword = new Splat.Timer(function(elapsedMillis) {
		if (this.time < this.expireMillis / 2 && game.keyboard.consumePressed("j")) {
			this.interrupted = true;
		}
		scene.swordUp.move(elapsedMillis);
		scene.swordDown.move(elapsedMillis);
		scene.swordLeft.move(elapsedMillis);
		scene.swordRight.move(elapsedMillis);
		if (this.interrupted && this.time >= this.expireMillis / 2) {
			game.sounds.play("sword");
			this.reset();
			this.interrupted = false;
			swordUp.reset();
			swordDown.reset();
			swordLeft.reset();
			swordRight.reset();
		}
	}, 250, function() {
		this.interrupted = false;
		this.reset();
		swordUp.reset();
		swordDown.reset();
		swordLeft.reset();
		swordRight.reset();
	});
	this.timers.sword.interrupted = false;

	function makeRandomPots(array, qty) {
		for (var i = 0; i < qty; i++) {
			array.push(makePot(randomBetween(0, canvas.width), randomBetween(0, canvas.height)));
		}
	}
	this.solid = [];
	this.solid.push(makeStove(0, 0));
	this.solid.push(makeStove(148, 0));
	this.solid.push(makeStove((148 * 2), 0));
	this.solid.push(makeStove((148 * 3), 0));
	this.solid.push(makeStove((148 * 4), 0));
	this.solid.push(makeStove((148 * 5), 0));
	this.solid.push(makeStove((148 * 6), 0));
	this.solid.push(makeStove((148 * 7), 0));
	makeRandomPots(this.solid, 15);
	this.solid.push(makePot(500, 500));
	this.solid.push(makeTurtle(800, 100));
	this.solid.push(makeTurtle(950, 300));
	this.solid.push(makeTurtle(1050, 600));
	this.ghosts = [];


	this.goundSprites = [
		game.animations.get("bg-1"),
		game.animations.get("bg-2"),
		game.animations.get("bg-3"),
		game.animations.get("bg-4")
	];

	// sprite array, x, y, width, height
	this.ground = tileArea(this.goundSprites, 0, 0, canvas.width, canvas.height);


}, function(elapsedMillis) {
	// simulation

	if (game.keyboard.consumePressed("f2")) {
		debug = !debug;
	}
	movePlayer(this.player);

	moveSword(this.player, this.timers.sword);
	// this.swordUp.move(elapsedMillis);
	// this.swordDown.move(elapsedMillis);
	// this.swordLeft.move(elapsedMillis);
	// this.swordRight.move(elapsedMillis);

	this.player.move(elapsedMillis);
	this.player.solveCollisions(this.solid, []);

	for (var i = 0; i < this.solid.length; i++) {
		this.solid[i].move(elapsedMillis);
		if (this.timers.sword.time < 120 || this.solid[i].exploding) {
			continue;
		}

		var hit;
		if (this.player.direction === "up" && this.swordUp.collides(this.solid[i])) {
			hit = this.solid.splice(i, 1)[0];
			hit.exploding = true;
			i--;
			hit.vy -= 1;
			this.ghosts.push(hit);
			game.sounds.play("pot-breaking");
		}
		if (this.player.direction === "down" && this.swordDown.collides(this.solid[i])) {
			hit = this.solid.splice(i, 1)[0];
			hit.exploding = true;
			i--;
			hit.vy += 1;
			this.ghosts.push(hit);
			game.sounds.play("pot-breaking");
		}
		if (this.player.direction === "left" && this.swordLeft.collides(this.solid[i])) {
			hit = this.solid.splice(i, 1)[0];
			hit.exploding = true;
			i--;
			hit.vx -= 1;
			this.ghosts.push(hit);
			game.sounds.play("pot-breaking");
		}
		if (this.player.direction === "right" && this.swordRight.collides(this.solid[i])) {
			hit = this.solid.splice(i, 1)[0];
			hit.exploding = true;
			i--;
			hit.vx += 1;
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

	sortAndDraw(context, this.ground);

	this.player.draw(context);
	outline(context, this.player, "red");
	this.swordUp.draw(context);
	this.swordDown.draw(context);
	this.swordLeft.draw(context);
	this.swordRight.draw(context);
	// if (this.swordvisible) {
	// 	outline(context, this.sword, "green");
	// }

	for (var i = 0; i < this.solid.length; i++) {
		this.solid[i].draw(context);
		outline(context, this.solid[i], "yellow");
	}
	for (i = 0; i < this.ghosts.length; i++) {
		this.ghosts[i].draw(context);
		outline(context, this.ghosts[i], "gray");
	}
}));

function outline(context, entity, color) {
	if (!debug) {
		return;
	}
	context.strokeStyle = color;
	context.strokeRect(entity.x, entity.y, entity.width, entity.height);
}

function randomBetween(min, max) {
	return Math.floor(Math.random() * max) + min;
}

function tileArea(sprites, x, y, width, height) {
	var array = [];
	for (var w = x; w < width; w += sprites[0].width) {
		for (var h = y; h < height; h += sprites[0].height) {
			var thisSprite = sprites[randomPick(sprites)];
			array.push(new Splat.AnimatedEntity(w, h, thisSprite.width, thisSprite.height, thisSprite, 0, 0));
		}
	}
	return array;
}

function sortAndDraw(context, entities) {
	var array = sortEntities(entities);
	for (var i = 0; i < array.length; i++) {
		array[i].draw(context);
	}
}

function sortEntities(entities) {
	return entities.sort(function(b, a) {
		return (b.y + b.height) - (a.y + a.height);
	});
}

function randomPick(array) {
	return Math.floor(Math.random() * array.length);
}

function centerText(context, text, offsetX, offsetY) {
	var w = context.measureText(text).width;
	var x = offsetX + (canvas.width / 2) - (w / 2) | 0;
	var y = offsetY | 0;
	context.fillText(text, x, y);
}
game.scenes.switchTo("loading");