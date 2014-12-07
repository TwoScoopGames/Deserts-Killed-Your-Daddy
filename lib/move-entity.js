module.exports = function(entity, up, down, left, right, accel, maxV) {
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
};
