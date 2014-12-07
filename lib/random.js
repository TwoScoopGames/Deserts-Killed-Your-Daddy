module.exports = {
	"pick": function (array) {
		return array[Math.floor(Math.random() * array.length)];
	},
	"between": function (min, max) {
		return Math.floor(Math.random() * max) + min;
	}
};
