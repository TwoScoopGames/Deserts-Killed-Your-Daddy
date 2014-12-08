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
	if (player.hp < 1) {
		return;
	}
	moveEntity(player,
		game.keyboard.isPressed("w") || game.keyboard.isPressed("up"),
		game.keyboard.isPressed("s") || game.keyboard.isPressed("down"),
		game.keyboard.isPressed("a") || game.keyboard.isPressed("left"),
		game.keyboard.isPressed("d") || game.keyboard.isPressed("right"),
		0.03,
		0.8);
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

function makePot(heartList, x, y) {
	var anim = game.animations.get("pot").copy();
	var pot = new Splat.AnimatedEntity(x, y, 56, 56, anim, -28, -13);
	pot.painRight = anim;
	pot.hitSound = ["pot-breaking"];
	pot.blowback = 0;
	pot.move = function(elapsedMillis) {
		if (!this.exploding) {
			return;
		}
		Splat.AnimatedEntity.prototype.move.call(this, elapsedMillis);
	};
	makeMoveDamageable(pot, 1, animationTotalTime(anim), 0.1, heartList);
	return pot;
}

function makeHeart(x, y) {
	var anim = game.animations.get("heart-item").copy();
	var heart = new Splat.AnimatedEntity(x, y, anim.width, anim.height, anim, 0, 0);
	heart.heal = 1;
	heart.time = 0;
	heart.hitSound = ["heart"];
	heart.exploding = true;
	heart.move = function(elapsedMillis) {
		Splat.AnimatedEntity.prototype.move.call(this, elapsedMillis);
		this.time += elapsedMillis;
		if (this.exploding && this.time > 200) {
			this.time = 0;
			this.exploding = false;
		}
		if (!this.fading && this.time > 4000) {
			this.sprite = game.animations.get("heart-fade").copy();
			this.fading = true;
			this.time = 0;
		}
		if (this.fading && this.time > 1000) {
			this.exploding = true;
			this.dead = true;
		}
	};
	return heart;
}

function makeStove(heartList, x, y) {
	var anim = game.animations.get("stove").copy();
	var stove = new Splat.AnimatedEntity(x, y, anim.width, anim.height - 74, anim, 0, 74 - anim.height);
	stove.hitSound = ["stove-hit-1", "stove-hit-2", "stove-hit-3"];
	stove.blowback = 0;
	stove.painAnims = [
		game.animations.get("destructable-oven-5").copy(),
		game.animations.get("destructable-oven-5").copy(),
		game.animations.get("destructable-oven-4").copy(),
		game.animations.get("destructable-oven-3").copy(),
		game.animations.get("destructable-oven-2").copy(),
		game.animations.get("destructable-oven-1").copy()
	];
	makeMoveDamageable(stove, 6, 500, 0.1, heartList);
	var oldMove = stove.move;
	stove.move = function(elapsedMillis) {
		this.painRight = this.painAnims[Math.min(this.painAnims.length - 1, this.hp)];
		oldMove.call(this, elapsedMillis);
		if (this.exploding) {
			this.sprite = this.painRight = this.painAnims[Math.min(this.painAnims.length - 1, this.hp)];
		}
	};
	return stove;
}

function makeMoveDamageable(entity, hp, invincibleTime, heartChance, heartList) {
	entity.hitTime = 0;
	entity.hp = hp;
	entity.heartChance = heartChance;
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
				this.hp--;
			}
			this.hitTime += elapsedMillis;

			if (this.hitTime > invincibleTime) {
				if (this.hp <= 0) {
					this.dead = true;
				} else {
					this.exploding = false;
				}
				this.hitTime = 0;
			}
			if (this.hp <= 0) {
				if (Math.random() < entity.heartChance) {
					heartList.push(makeHeart(entity.x, entity.y));
				}
				entity.heartChance = 0;
			}
		}
		origMove.call(this, elapsedMillis);
	};
}

function makeTurtle(heartList, type, x, y) {
	var anim = game.animations.get("cake-turtle-" + type + "left").copy();
	var turtle = new Splat.AnimatedEntity(x, y, 74, 74, anim, -25, -4);
	turtle.walkLeft = anim;
	turtle.walkRight = game.animations.get("cake-turtle-" + type + "right").copy();
	turtle.painLeft = game.animations.get("cake-turtle-" + type + "pain-left").copy();
	turtle.painRight = game.animations.get("cake-turtle-" + type + "pain-right").copy();
	turtle.direction = "left";
	turtle.damage = 1;
	turtle.hitSound = ["hurt", "hurt2"];
	turtle.blowback = 1;
	turtle.score = 1;
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
	makeMoveDamageable(turtle, 2, 400, 0.02, heartList);
	return turtle;
}

function makeCookie(heartList, type, speed, hp, player, x, y) {
	var anim = game.animations.get("cookie-" + type + "-left").copy();
	var cookie = new Splat.AnimatedEntity(x, y, 74, 74, anim, -25, -4);
	cookie.walkLeft = anim;
	cookie.walkRight = game.animations.get("cookie-" + type + "-right").copy();
	cookie.painLeft = game.animations.get("cookie-" + type + "-pain-left").copy();
	cookie.painRight = game.animations.get("cookie-" + type + "-pain-right").copy();
	cookie.direction = "left";
	cookie.damage = 1;
	cookie.hitSound = ["cookie-" + type + "-pain", "cookie-" + type + "-pain2", "cookie-" + type + "-pain3"];
	cookie.blowback = 1;
	cookie.score = 1;
	cookie.move = function(elapsedMillis) {
		if (player.wasLeft(this)) {
			this.direction = "left";
		}
		if (player.wasRight(this)) {
			this.direction = "right";
		}
		if (!this.exploding) {
			moveEntity(this, player.wasAbove(this), player.wasBelow(this), this.direction === "left", this.direction === "right", 0.01, speed);
		}
		Splat.AnimatedEntity.prototype.move.call(this, elapsedMillis);
	};
	makeMoveDamageable(cookie, hp, 400, 0.02, heartList);
	return cookie;
}

function makeGingerboss(heartList, player, x, y) {
	var anim = game.animations.get("gingerboss-down").copy();
	var gingerboss = new Splat.AnimatedEntity(x, y, 171, 62, anim, -37, -248);
	gingerboss.walkDown = anim;
	gingerboss.walkUp = game.animations.get("gingerboss-up").copy();
	gingerboss.painDown = game.animations.get("gingerboss-up-pain").copy();
	gingerboss.painUp = game.animations.get("gingerboss-down-pain").copy();
	gingerboss.direction = "down";
	gingerboss.damage = 1;
	gingerboss.hitSound = ["cookie-raisin-pain", "cookie-raisin-pain2", "cookie-raisin-pain3"];
	gingerboss.blowback = 0.5;
	gingerboss.score = 1;
	gingerboss.enterSound = "gingerboss-enter";
	gingerboss.move = function(elapsedMillis) {
		if (player.wasAbove(this)) {
			this.direction = "up";
		}
		if (player.wasBelow(this)) {
			this.direction = "down";
		}
		if (!this.exploding) {
			moveEntity(this, this.direction === "up", this.direction === "down", player.wasLeft(this), player.wasRight(this), 0.01, 0.2);
		}
		Splat.AnimatedEntity.prototype.move.call(this, elapsedMillis);
	};
	makeMoveDamageable(gingerboss, 10, 400, 0.02, heartList);
	return gingerboss;
}

function animationTotalTime(anim) {
	var time = 0;
	for (var i = 0; i < anim.frames.length; i++) {
		time += anim.frames[i].time;
	}
	return time;
}

function makeFallingEntity(x, y, entity, list, player) {
	var fallingSpeed = 1;
	var anim = game.animations.get(entity.width > 74 ? "shadow-big" : "shadow").copy();

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
			if (this.source.enterSound) {
				game.sounds.play(this.source.enterSound);
			}

			if (this.collides(player)) {
				player.exploding = true;
				game.sounds.play(random.pick(player.hitSound));
			}
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
	this.timers.running = new Splat.Timer(null, 2000, function() {
		game.scenes.switchTo("game-title");
	});
	this.timers.running.start();
}, function(elapsedMillis) {
	game.animations.get("two-scoop").move(elapsedMillis);
}, function(context) {
	context.fillStyle = "#93cbcd";
	context.fillRect(0, 0, canvas.width, canvas.height);
	var anim = game.animations.get("two-scoop");
	context.fillStyle = "#ffffff";
	context.font = "50px olivier";
	centerText(context, "Two Scoop Games", 0, (canvas.height / 2) + (anim.height / 2) + 30);

	anim.draw(context, (canvas.width / 2) - (anim.width / 2), (canvas.height / 2) - (anim.height / 2));
}));

game.scenes.add("game-title", new Splat.Scene(canvas, function() {
	// initialization
}, function() {
	// simulation
	if (game.keyboard.consumePressed("space") || game.keyboard.consumePressed("j")) {
		game.scenes.switchTo("main");
	}
}, function(context) {
	// draw
	context.drawImage(game.images.get("title"), 0, 0);
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

var tilesWide = Math.floor(canvas.width / 74);
var tilesTall = Math.floor(canvas.height / 74);
function spawnRandom(scene, builder) {
	var x = Math.floor(Math.random() * tilesWide) * 74;
	var y = Math.floor(Math.random() * tilesTall) * 74;

	scene.ghosts.push(makeFallingEntity(x, y, builder(0, 0), scene.solid, scene.player));
	game.sounds.play("fall");
}

function keepOnScreen(entity) {
	if (entity.x < 0) {
		entity.x = 0;
	}
	if (entity.x + entity.width > canvas.width) {
		entity.x = canvas.width - entity.width;
	}
	if (entity.y < 0) {
		entity.y = 0;
	}
	if (entity.y + entity.height > canvas.height) {
		entity.y = canvas.height - entity.height;
	}
}

var score = 0;
game.scenes.add("main", new Splat.Scene(canvas, function() {
	// initialization
	game.sounds.play("music", true);
	score = 0;

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
	this.player.hitSound = ["pain", "pain2", "pain3"];
	makeMoveDamageable(this.player, 5, 1000, 0, []);

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
	this.ghosts = [];

	var mkPot = makePot.bind(undefined, this.ghosts);
	var mkStove = makeStove.bind(undefined, this.ghosts);
	var mkTurtle = makeTurtle.bind(undefined, this.ghosts, "");
	var mkChocTurtle = makeTurtle.bind(undefined, this.ghosts, "choc-");
	var mkPurpleTurtle = makeTurtle.bind(undefined, this.ghosts, "purple-");
	var makeRaisin = makeCookie.bind(undefined, this.ghosts, "raisin", 0.1, 3, this.player);
	var makeChip = makeCookie.bind(undefined, this.ghosts, "chip", 0.3, 2, this.player);
	var makeSnickerdoodle = makeCookie.bind(undefined, this.ghosts, "snickerdoodle", 0.6, 1, this.player);
	var makePeanutButter = makeCookie.bind(undefined, this.ghosts, "peanutbutter", 0.3, 2, this.player);
	var mkGingerboss = makeGingerboss.bind(undefined, this.ghosts, this.player);

	spawnRandom(this, mkPot);
	spawnRandom(this, mkPot);
	spawnRandom(this, mkPot);
	spawnRandom(this, mkPot);
	spawnRandom(this, mkPot);
	spawnRandom(this, mkTurtle);
	spawnRandom(this, mkPurpleTurtle);
	spawnRandom(this, mkStove);

	this.goundSprites = [
		game.animations.get("bg-1"),
		game.animations.get("bg-2"),
		game.animations.get("bg-3"),
		game.animations.get("bg-4"),
		// game.animations.get("bg-5")
	];

	this.ground = entities.sort(tile.fillAreaRandomly(this.goundSprites, 0, 0, canvas.width, canvas.height));

	this.timers.spawn = new Splat.Timer(undefined, 1000, function() {
		spawnRandom(scene, random.pick([mkPot, mkTurtle, mkPurpleTurtle, mkChocTurtle, mkStove, makeChip, makeSnickerdoodle, makeRaisin, makePeanutButter]));
		this.reset();
		this.start();
	});
	this.timers.spawn.start();

	this.timers.gingerboss = new Splat.Timer(undefined, 1000, function() {
		this.iters++;
		if (this.iters < 3) {
			this.reset();
			this.start();
			return;
		}

		spawnRandom(scene, mkGingerboss);
		this.iters = 0;
	});
	this.timers.gingerboss.iters = 0;
}, function(elapsedMillis) {
	// simulation

	var heart = game.animations.get("heart-full");
	heart.frames[0].time = 1000;
	heart.move(elapsedMillis);

	if (game.keyboard.consumePressed("f2")) {
		debug = !debug;
	}

	movePlayer(this.player);
	keepOnScreen(this.player);
	moveSword(this.player, this.timers.sword);

	this.player.move(elapsedMillis);
	if (this.player.dead) {
		game.scenes.switchTo("gameover");
	}

	var collided = this.player.solveCollisions(this.solid);
	for (var i = 0; i < collided.length; i++) {
		if (collided[i].heal) {
			this.player.hp += collided[i].heal;
			collided[i].exploding = true;
			collided[i].dead = true;
			game.sounds.play("heart");
		}
		if (this.player.collides(collided[i])) {
			resolveCollisionShortest(this.player, collided[i]);
			continue;
		}
		if (!this.player.exploding && collided[i].damage) {
			this.player.exploding = true;
			game.sounds.play(random.pick(this.player.hitSound));
		}
	}

	for (i = 0; i < this.solid.length; i++) {
		this.solid[i].move(elapsedMillis);
		keepOnScreen(this.solid[i]);
		var hit = this.solid[i];
		if (this.timers.sword.time > 120) {
			if (this.player.direction === "up" && this.swordUp.collides(this.solid[i])) {
				hit.exploding = true;
				hit.vy -= hit.blowback;
				game.sounds.play(random.pick(hit.hitSound));
				if (hit.heal) {
					this.player.hp += hit.heal;
				}
			}
			if (this.player.direction === "down" && this.swordDown.collides(this.solid[i])) {
				hit.exploding = true;
				hit.vy += hit.blowback;
				game.sounds.play(random.pick(hit.hitSound));
				if (hit.heal) {
					this.player.hp += hit.heal;
				}
			}
			if (this.player.direction === "left" && this.swordLeft.collides(this.solid[i])) {
				hit.exploding = true;
				hit.vx -= hit.blowback;
				game.sounds.play(random.pick(hit.hitSound));
				if (hit.heal) {
					this.player.hp += hit.heal;
				}
			}
			if (this.player.direction === "right" && this.swordRight.collides(this.solid[i])) {
				hit.exploding = true;
				hit.vx += hit.blowback;
				game.sounds.play(random.pick(hit.hitSound));
				if (hit.heal) {
					this.player.hp += hit.heal;
				}
			}
		}
		if (hit.exploding) {
			this.solid.splice(i, 1);
			i--;
			this.ghosts.push(hit);
		}
	}
	for (i = 0; i < this.ghosts.length; i++) {
		this.ghosts[i].move(elapsedMillis);
		keepOnScreen(this.ghosts[i]);
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
			if (this.ghosts[i].score) {
				score += this.ghosts[i].score;
				game.sounds.play("pop");

				if (score % 50 === 0) {
					this.timers.gingerboss.start();
					game.sounds.play("siren");
				}
			}
			this.ghosts.splice(i, 1);
			i--;
		}
	}
}, function(context) {
	// draw

	entities.draw(context, this.ground);

	var toDraw = [this.swordUp, this.swordLeft, this.swordRight, this.player, this.swordDown];
	outline(context, this.player, "red");

	toDraw = toDraw.concat(this.solid.slice(0));
	for (var i = 0; i < this.solid.length; i++) {
		outline(context, this.solid[i], "yellow");
	}
	toDraw = toDraw.concat(this.ghosts.slice(0));
	for (i = 0; i < this.ghosts.length; i++) {
		outline(context, this.ghosts[i], "gray");
	}
	entities.draw(context, entities.sort(toDraw));

	if (this.timers.gingerboss.running) {
		var alpha = Math.min(0.5, Splat.math.oscillate(this.timers.gingerboss.time, 500));
		context.fillStyle = "rgba(226, 0, 0, " + alpha + ")";
		context.fillRect(0, 0, canvas.width, canvas.height);

		context.font = "50px helvetica";
		context.fillStyle = "rgba(255, 255, 255, " + alpha + ")";
		centerText(context, "GINGERBOSS INCOMING", 0, canvas.height / 2);
	}

	for (i = 0; i < this.player.hp; i++) {
		game.animations.get("heart-full").draw(context, 30 + i * 50, 30);
	}

	context.font = "25px helvetica";
	context.fillText(score, 800, 50);
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

game.scenes.add("gameover", new Splat.Scene(canvas, function() {
	// initialization
	this.timers.next = new Splat.Timer(undefined, 1000, undefined);
	this.timers.next.start();
}, function(elapsedMillis) {
	// simulation
	if (!this.timers.next.running && (game.keyboard.consumePressed("space") || game.keyboard.consumePressed("j"))) {
		game.scenes.switchTo("main");
	}

	game.animations.get("game-over").move(elapsedMillis);
}, function(context) {
	// draw
	context.fillStyle = "black";
	context.fillRect(0, 0, canvas.width, canvas.height);

	context.fillStyle = "#fff";
	context.font = "25px helvetica";
	centerText(context, "GAME OVER", 0, canvas.height / 2 - 13);
	centerText(context, score + " PTS", 0, canvas.height / 2 + 30);
	if (!this.timers.next.running) {
		centerText(context, "J or SPACE to RESTART", 0, canvas.height / 2 + 100);
	}

	game.animations.get("game-over").draw(context, 885, 485);
}));

game.scenes.switchTo("loading");
