require('should');
const airtable = require('../airtable');
const appRoot = require('app-root-path');

describe('Airtable', () => {
	/*it('should get current term', done => {
		let term = airtable.getCurrentTerm();
		done();
	});

	*/

	/*it('should get lead by email', done => {
		airtable.getLeadByEmail('william.okai@nyfa.com').then(record => {
			// console.log(record);
			done();
		});
	});

	it('should get or create lead doc', done => {
		// william.okai@nyfa.com
		airtable.getLeadByEmail('jaylvachon@gmail.com')
			.then(record => airtable.getOrCreateLeadDoc(record))
			.then(leadDoc => {
				console.log(leadDoc);
				done();
			});
	});*/

	it('should get the leads table', done => {
		airtable.listLeads().then(records => {
			// console.log(records);
			done();
		});
	});

	it('should get the docs table', function(done) {
		this.timeout(5000);
		airtable.listDocs().then(records => {
			// console.log(records);
			done();
		});
	});

	it('should get the info table', function(done) {
		this.timeout(5000);
		airtable.listInfo().then(records => {
			// console.log(records);
			done();
		});
	});


	/*it('should upload attachment', done => {
		
		let filePath = `${appRoot}/public/20200125_084614~2.jpg`;
		let fileName = 'VachonJay_ID.jpg';

		airtable.getLeadByEmail('jaylvachon@gmail.com')
			.then(record => airtable.getOrCreateLeadDoc(record))
			.then(records => airtable.uploadAttachment(records.leadDoc, filePath, fileName))
			.then(res => {
				console.log(res);
				done();
			});
	});*/
});