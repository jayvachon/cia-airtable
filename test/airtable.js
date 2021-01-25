require('should');
const airtable = require('../airtable');
const appRoot = require('app-root-path');

describe('Airtable', () => {
	/*it('should get current term', done => {
		let term = airtable.getCurrentTerm();
		done();
	});

	it('should get the docs table', done => {
		airtable.listDocs().then(records => {
			// console.log(records);
			done();
		});
	});

	it('should get the info table', done => {
		airtable.listInfo().then(records => {
			// console.log(records);
			done();
		});
	});*/

	it('should get lead by email', done => {
		airtable.getLeadByEmail('william.okai@nyfa.com').then(record => {
			// console.log(record);
			done();
		});
	});

	it('should get or create lead doc', done => {
		// william.okai@nyfa.com
		airtable.getLeadByEmail('jaylvachon@gmail.com')
			.then(record => airtable.getOrCreateLeadDoc(record))
			.then(docs => {
				console.log(docs);
				done();
			});
	});
});