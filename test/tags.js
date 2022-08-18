require('should');
const tags = require('../services/tags');
const appRoot = require('app-root-path');

describe('Tags', () => {
	it('should get the current term tag', done => {
		tags.getTermTag('2022-09').then(termTag => {
			console.log(termTag);
			done();
		});
	});
});