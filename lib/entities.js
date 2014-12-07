module.exports = {
	"sort": function (entities) {
		return entities.sort(function(b, a) {
			return (b.y + b.height) - (a.y + a.height);
		});
	},
	"draw": function (context, entities) {
		for (var i = 0; i < entities.length; i++) {
			entities[i].draw(context);
		}
	}
};
