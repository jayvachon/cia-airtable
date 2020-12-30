const tesseract = require('node-tesseract');

const readSSN = () => {
	tesseract.process(__dirname + '/samples/ssc.jpg', (err, text) => {
		console.log(err);
		console.log(text);
	});
}

module.exports = {
	readSSN,
};