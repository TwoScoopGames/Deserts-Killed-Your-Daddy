module.exports = function(entity, up, down, left, right, accel, maxV) {
	var xPressed = left || right;
	var yPressed = up || down;

	if (up) {
		if (entity.vy > -maxV) {
			entity.vy -= accel;
		}
		if (!xPressed && entity.walkUp) {
			entity.direction = "up";
			entity.sprite = entity.walkUp;
		}
	}
	if (down) {
		if (entity.vy < maxV) {
			entity.vy += accel;
		}
		if (!xPressed && entity.walkDown) {
			entity.direction = "down";
			entity.sprite = entity.walkDown;
		}
	}
	// friction
	if (!yPressed) {
		if (entity.vy < 0) {
			entity.vy = Math.min(entity.vy + accel, 0);
		} else if (entity.vy > 0) {
			entity.vy = Math.max(entity.vy - accel, 0);
		}
	}

	if (left) {
		if (entity.vx > -maxV) {
			entity.vx -= accel;
		}
		if (!yPressed && entity.walkLeft) {
			entity.direction = "left";
			entity.sprite = entity.walkLeft;
		}
	}
	if (right) {
		if (entity.vx < maxV) {
			entity.vx += accel;
		}
		if (!yPressed && entity.walkRight) {
			entity.direction = "right";
			entity.sprite = entity.walkRight;
		}
	}
	// friction
	if (!xPressed) {
		if (entity.vx < 0) {
			entity.vx = Math.min(entity.vx + accel, 0);
		} else if (entity.vx > 0) {
			entity.vx = Math.max(entity.vx - accel, 0);
		}
	}

	if (entity.vx === 0 && entity.vy === 0 && !entity.exploding) {
		entity.sprite.reset();
	}
};
