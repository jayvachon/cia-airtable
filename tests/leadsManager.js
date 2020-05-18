require('should');
const leadsManager = require('../leadsManager');

describe('Leads Manager', () => {

	it('should insert a new lead record', done => {

		const lead = {
			id: 'x',
			content: {
				email: 'test@test.com',
				phone: '(555) 555-555',
				firstName: 'First',
				lastName: 'Last',
				studentType: 'Veteran - CH-33',
				aid: 'No',
				program: 'Javascript - Web Development',
				message: 'Message',
			},
		};

		leadsManager.insertUnique([lead]).then(newLeads => {
			newLeads.should.be.an.instanceOf(Array);
			done();
		});
	});
});