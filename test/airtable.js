require('should');
const airtable = require('../airtable');
const appRoot = require('app-root-path');

describe('Airtable', () => {
	it('should get current term', done => {
		let term = airtable.getCurrentTerm();
		done();
	});

	it('should get the docs table', done => {
		airtable.listDocs().then(records => {
			console.log(records);
			done();
		});
	});

	it('should get the info table', done => {
		airtable.listInfo().then(records => {
			console.log(records);
			done();
		});
	});
});