"use strict";

var entities = require("./lib/entities");
var moveEntity = require("./lib/move-entity");
var random = require("./lib/random");
var Splat = require("splatjs");
var tile = require("./lib/tile");

var canvas = document.getElementById("canvas");

var manifest = require("./manifest.json");

var game = new Splat.Game(canvas, manifest);

function movePlayer(player) {
	moveEntity(player, game.keyboard.isPressed("w"), game.keyboard.isPressed("s"), game.keyboard.isPressed("a"), game.keyboard.isPressed("d"), 0.03, 0.8);
}

function moveSword(player, timer) {
	if (game.keyboard.consumePressed("j") || game.keyboard.consumePressed("space")) {
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
	pot.painRight = anim;
	pot.hitSound = ["pot-breaking"];
	pot.move = function(elapsedMillis) {
		if (!this.exploding) {
			return;
		}
		Splat.AnimatedEntity.prototype.move.call(this, elapsedMillis);
	};
	makeMoveDamageable(pot, 1, animationTotalTime(anim));
	return pot;
}

function makeStove(x, y) {
	var anim = game.animations.get("stove").copy();
	var stove = new Splat.AnimatedEntity(x, y, 148, 148, anim, 0, 0);
	stove.hitSound = ["clank"];
	return stove;
}

function makeMoveDamageable(entity, hp, invincibleTime) {
	entity.hitTime = 0;
	entity.hp = hp;
	var origMove = entity.move;

	entity.move = function(elapsedMillis) {
		if (this.exploding) {
			this.sprite = this.painRight;
			if (this.direction === "left") {
				this.sprite = this.painLeft;
			}
			if (this.direction === "up") {
				this.sprite = this.painUp;
			}
			if (this.direction === "down") {
				this.sprite = this.painDown;
			}

			if (this.hitTime === 0) {
				this.sprite.reset();
			}
			this.hitTime += elapsedMillis;

			if (this.hitTime > invincibleTime) {
				this.hp--;
				if (this.hp === 0) {
					this.dead = true;
				} else {
					this.exploding = false;
				}
				this.hitTime = 0;
			}
		}
		origMove.call(this, elapsedMillis);
	};
}

function makeTurtle(x, y) {
	var anim = game.animations.get("cake-turtle-left").copy();
	var turtle = new Splat.AnimatedEntity(x, y, 74, 74, anim, -25, -4);
	turtle.walkLeft = anim;
	turtle.walkRight = game.animations.get("cake-turtle-right").copy();
	turtle.painLeft = game.animations.get("cake-turtle-pain-left").copy();
	turtle.painRight = game.animations.get("cake-turtle-pain-right").copy();
	turtle.direction = "left";
	turtle.damage = 1;
	turtle.hitSound = ["hurt", "hurt2"];
	turtle.move = function(elapsedMillis) {
		if (this.direction === "left" && this.x < 200) {
			this.direction = "right";
		}
		if (this.direction === "right" && this.x > 800) {
			this.direction = "left";
		}
		moveEntity(this, false, false, !this.exploding && this.direction === "left", !this.exploding && this.direction === "right", 0.01, 0.3);
		Splat.AnimatedEntity.prototype.move.call(this, elapsedMillis);
	};
	makeMoveDamageable(turtle, 2, 400);
	return turtle;
}

function animationTotalTime(anim) {
	var time = 0;
	for (var i = 0; i < anim.frames.length; i++) {
		time += anim.frames[i].time;
	}
	return time;
}

function makeFallingEntity(x, y, entity, list) {
	var fallingSpeed = 1;
	var anim = game.animations.get("shadow");

	entity.x = x + ((anim.width - entity.width) / 2);
	entity.y = y - (fallingSpeed * animationTotalTime(anim));
	entity.vy = fallingSpeed;

	var shadow = new Splat.AnimatedEntity(x, y, 74, 74, anim, 0, 40);
	shadow.exploding = true;
	shadow.source = entity;
	shadow.move = function(elapsedMillis) {
		Splat.AnimatedEntity.prototype.move.call(this, elapsedMillis);
		Splat.Entity.prototype.move.call(this.source, elapsedMillis);
		if (this.source.y === this.y) {
			this.dead = true;
			this.source.vy = 0;
			list.push(this.source);
		}
	};
	shadow.draw = function(context) {
		Splat.AnimatedEntity.prototype.draw.call(this, context);
		Splat.AnimatedEntity.prototype.draw.call(this.source, context);
	};

	return shadow;
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
		outline(context, this, "green");
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

function resolveCollisionShortest(player, entity) {
	var bottom = [0, entity.y + entity.height - player.y, 0, 0.5];
	var top = [0, entity.y - player.height - player.y, 0, -0.5];
	var right = [entity.x + entity.width - player.x, 0, 0.5, 0];
	var left = [entity.x - player.width - player.x, 0, -0.5, 0];

	var smallest = [bottom, top, right, left].reduce(function(prev, curr) {
		if (Math.abs(curr[0] + curr[1]) < Math.abs(prev[0] + prev[1])) {
			return curr;
		}
		return prev;
	});
	player.x += smallest[0];
	player.y += smallest[1];
	player.vx += smallest[2];
	player.vy += smallest[3];
}

game.scenes.add("main", new Splat.Scene(canvas, function() {
	// initialization
	game.sounds.play("music", true);
	var playerWalkDown = game.animations.get("player-walk-down");
	this.player = new Splat.AnimatedEntity(300, 300, 39, 51, playerWalkDown, -12, -19);
	this.player.walkUp = game.animations.get("player-walk-up");
	this.player.walkDown = playerWalkDown;
	this.player.walkLeft = game.animations.get("player-walk-left");
	this.player.walkRight = game.animations.get("player-walk-right");
	this.player.direction = "down";
	this.player.painUp = game.animations.get("player-pain-down");
	this.player.painDown = game.animations.get("player-pain-down");
	this.player.painLeft = game.animations.get("player-pain-down");
	this.player.painRight = game.animations.get("player-pain-down");
	makeMoveDamageable(this.player, 5, 1000);

	var swordUp = game.animations.get("player-sword-up");
	var swordDown = game.animations.get("player-sword-down");
	var swordLeft = game.animations.get("player-sword-left");
	var swordRight = game.animations.get("player-sword-right");

	this.swordUp = new Splat.AnimatedEntity(0, 0, swordUp.width - 20 - 20, swordUp.height - 31 - 25, swordUp, -20, -31);
	this.swordUp.move = moveRelativeTo(this.player, -130, -swordUp.height + 31 + 25);
	this.swordUp.draw = makeSwordDraw(this.player, "up");

	this.swordDown = new Splat.AnimatedEntity(0, 0, swordDown.width - 27 - 39, swordDown.height - 29 - 25, swordDown, -27, -29);
	this.swordDown.move = moveRelativeTo(this.player, -130, this.player.height);
	this.swordDown.draw = makeSwordDraw(this.player, "down");

	this.swordLeft = new Splat.AnimatedEntity(0, 0, swordLeft.width - 40, swordLeft.height - 58, swordLeft, -30, -24);
	this.swordLeft.move = moveRelativeTo(this.player, -swordLeft.width + 40, -140);
	this.swordLeft.draw = makeSwordDraw(this.player, "left");

	this.swordRight = new Splat.AnimatedEntity(0, 0, swordRight.width - 40, swordRight.height - 58, swordRight, -10, -24);
	this.swordRight.move = moveRelativeTo(this.player, this.player.width, -140);
	this.swordRight.draw = makeSwordDraw(this.player, "right");

	this.swordVisible = false;
	var scene = this;
	this.timers.sword = new Splat.Timer(function(elapsedMillis) {
		if (this.time < this.expireMillis / 2 && (game.keyboard.consumePressed("j") || (game.keyboard.consumePressed("space")))) {
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

	this.solid = [];
	this.solid.push(makeStove(0, 0));
	this.solid.push(makeStove(148, 0));
	this.solid.push(makeStove((148 * 2), 0));
	this.solid.push(makeStove((148 * 3), 0));
	this.solid.push(makeStove((148 * 4), 0));
	this.solid.push(makeStove((148 * 5), 0));
	this.solid.push(makeStove((148 * 6), 0));
	this.solid.push(makeStove((148 * 7), 0));
	this.solid.push(makePot(500, 500));
	this.solid.push(makeTurtle(800, 100));
	this.solid.push(makeTurtle(950, 300));
	this.solid.push(makeTurtle(1050, 600));
	this.ghosts = [];
	this.ghosts.push(makeFallingEntity(74 * 5, 74 * 5, makePot(0, 0), this.solid));

	this.goundSprites = [
		game.animations.get("bg-1"),
		game.animations.get("bg-2"),
		game.animations.get("bg-3"),
		game.animations.get("bg-4"),
		// game.animations.get("bg-5")
	];

	this.ground = entities.sort(tile.fillAreaRandomly(this.goundSprites, 0, 0, canvas.width, canvas.height));

}, function(elapsedMillis) {
	// simulation

	if (game.keyboard.consumePressed("f2")) {
		debug = !debug;
	}
	if (game.keyboard.consumePressed("h")) {
		this.ghosts.push(makeFallingEntity(74 * 5, 74 * 5, makePot(0, 0), this.solid));
	}

	movePlayer(this.player);
	moveSword(this.player, this.timers.sword);

	this.player.move(elapsedMillis);

	var collided = this.player.solveCollisions(this.solid);
	for (var i = 0; i < collided.length; i++) {
		if (this.player.collides(collided[i])) {
			resolveCollisionShortest(this.player, collided[i]);
			this.player.hp--;
			continue;
		}
		if (collided[i].damage) {
			this.player.exploding = true;
		}
	}

	for (i = 0; i < this.solid.length; i++) {
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
			game.sounds.play(random.pick(hit.hitSound));
		}
		if (this.player.direction === "down" && this.swordDown.collides(this.solid[i])) {
			hit = this.solid.splice(i, 1)[0];
			hit.exploding = true;
			i--;
			hit.vy += 1;
			this.ghosts.push(hit);
			game.sounds.play(random.pick(hit.hitSound));
		}
		if (this.player.direction === "left" && this.swordLeft.collides(this.solid[i])) {
			hit = this.solid.splice(i, 1)[0];
			hit.exploding = true;
			i--;
			hit.vx -= 1;
			this.ghosts.push(hit);
			game.sounds.play(random.pick(hit.hitSound));
		}
		if (this.player.direction === "right" && this.swordRight.collides(this.solid[i])) {
			hit = this.solid.splice(i, 1)[0];
			hit.exploding = true;
			i--;
			hit.vx += 1;
			this.ghosts.push(hit);
			game.sounds.play(random.pick(hit.hitSound));
		}
	}
	for (i = 0; i < this.ghosts.length; i++) {
		this.ghosts[i].move(elapsedMillis);
		if (!this.ghosts[i].exploding) {
			this.solid.push(this.ghosts.splice(i, 1)[0]);
			if (i > 0) {
				i--;
			}
			if (this.ghosts.length === 0) {
				break;
			}
		}
		if (this.ghosts[i].dead) {
			this.ghosts.splice(i, 1);
			i--;
		}
	}
}, function(context) {
	// draw

	entities.draw(context, this.ground);

	this.swordUp.draw(context);
	this.swordLeft.draw(context);
	this.swordRight.draw(context);
	this.player.draw(context);
	outline(context, this.player, "red");
	this.swordDown.draw(context);

	for (var i = 0; i < this.solid.length; i++) {
		this.solid[i].draw(context);
		outline(context, this.solid[i], "yellow");
	}
	for (i = 0; i < this.ghosts.length; i++) {
		this.ghosts[i].draw(context);
		outline(context, this.ghosts[i], "gray");
	}

	var heart = game.images.get("heart");
	for (i = 0; i < this.player.hp; i++) {
		context.drawImage(heart, 30 + i * 50, 30);
	}
}));

function outline(context, entity, color) {
	if (!debug) {
		return;
	}
	context.strokeStyle = color;
	context.strokeRect(entity.x, entity.y, entity.width, entity.height);
}

function centerText(context, text, offsetX, offsetY) {
	var w = context.measureText(text).width;
	var x = offsetX + (canvas.width / 2) - (w / 2) | 0;
	var y = offsetY | 0;
	context.fillText(text, x, y);
}
game.scenes.switchTo("loading");