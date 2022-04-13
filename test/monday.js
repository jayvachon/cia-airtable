require('should');
const appRoot = require('app-root-path');
const monday = require('../services/monday');
// const appRoot = require('app-root-path');

describe('Monday', () => {

	/*it('should get the terms', done => {
		monday.getTerms().then(res => {
			res.should.be.an.Array();
			done();
		});
	});*/

	/*it('should get access token', done => {
		let token = monday.getAccessToken();
		token.should.be.type('string');
		done();
	});

	it('should list the boards', done => {
		monday.test().then(res => {
			// console.log(res);
			done();
		});
	})

	it('should list the groups', done => {
		monday.getGroups().then(res => {
			// console.log(res);
			done();
		});
	});
*/
	/*it('should find a lead by email', done => {
		monday.getLead('luisespinal294@gmail.com').then(res => {
			// console.log(JSON.stringify(res, null, 2));
			console.log(res);
			done();
		})
	});*/

	/*it('should get or create a new lead', done => {
		monday.getOrCreateLead('test3@test.com').then(res => {
			console.log(res);
			done();
		});
	});*/

	/*it('should update item columns', done => {

		const columnValues = [
			{ column: 'socialSecurityNumber', value: '012345678' }
		];
		monday.updateLeadValues('2200080442', columnValues).then(res => {
			console.log(res);
			done();
		});
	});*/

	/*it('should get lead by id', done => {
		const id = 2233510679;
		monday.getLeadById(id).then(res => {
			console.log(res);
			done();
		});
	});*/

	it('should list the columns', done => {
		monday.getColumns().then(res => {
			console.log(res);
			res.should.be.an.Object;
			done();
		})
	});

	/*it('should list the term columns', done => {
		monday.getTermColumns().then(res => {
			console.log(res);
			res.should.be.an.Object;
			done();
		})
	});*/

	/*it('should get current term', done => {
		monday.getCurrentTerm().then(res => {
			console.log(res);
			res.should.be.an.Object;
			done();
		})
		.catch(err => {
			console.error(err);
			done();
		});
	});*/

	/*it('should get students for creation in populi', done => {
		monday.getStudentsForPopuliCreation().then(res => {
			console.log(res);
			done();
		});
	})*/

	/*it('should upload a file', done => {

		const leadId = 2200080442;
		const file = `${appRoot}/uploads/IES.pdf`;

		monday.uploadLeadDocument(leadId, 'identification', file)
			.then(res => {
				console.log(res)
				done();
			})
	});*/

	/*it('should create a new lead', done => {
		monday.createLead().then(res => {
			console.log(res);
			done();
		})
	});*/

	/*it('should insert a unique new lead', done => {
		const leads = [
			{
				id: '0',
				content: {
					email: 'jay.vachon@codeimmersives.com',
				}
			},
			{
				id: '1',
				content: {
					email: 'test@codeimmersives.com',
				}
			},
			{
				id: '2',
				content: {
					email: 'test@codeimmersives.com', // this one should be skipped
				}
			},
			{
				id: '3',
				content: {
					email: 'crazy@new.com',
					phone: '1234567899',
					firstName: 'crazy',
					lastName: 'newlead',
					studentType: 'Veteran - CH-33',
					program: 'Javascript - Web Development',
				}
			}
		];

		monday.insertUnique(leads).then(res => {
			console.log(res)
			done();
		});
	});*/
});