require('should');
const airtable = require('../airtable');
const appRoot = require('app-root-path');

describe('Airtable', () => {
	it('should get the docs table', done => {
		airtable.listDocs().then(records => {
			console.log(records);
			done();
		});
	});
});