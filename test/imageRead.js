require('should');
const imageRead = require('../services/imageRead');
const appRoot = require('app-root-path');

describe('Image Reader', () => {

	it('should read social security number', done => {
		imageRead.readSSN();
		done();
	});
});