var random = require("./random");
var Splat = require("splatjs");

module.exports = {
	"fillAreaRandomly": function (sprites, x, y, width, height) {
		var array = [];
		for (var w = x; w < width; w += sprites[0].width) {
			for (var h = y; h < height; h += sprites[0].height) {
				var thisSprite = sprites[random.pick(sprites)];
				array.push(new Splat.AnimatedEntity(w, h, thisSprite.width, thisSprite.height, thisSprite, 0, 0));
			}
		}
		return array;
	}
};
