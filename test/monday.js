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
	})*/

	/*it('should list the groups', done => {
		monday.getGroups().then(res => {
			console.log(res);
			done();
		});
	});*/

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

	/*it('should list the columns', done => {
		monday.getColumns().then(res => {
			console.log(res);
			res.should.be.an.Object;
			done();
		})
	});*/

	/*it('should list the term columns', done => {
		monday.getTermColumns().then(res => {
			console.log(res);
			res.should.be.an.Object;
			done();
		})
	});*/

	it('should list the enrollment process columns', done => {
		monday.getEnrollmentColumns().then(res => {
			console.log(res);
			res.should.be.an.Object;
			done();
		});

		/*{
		  columns: [
		    { id: 'name', title: 'Name', type: 'name' },
		    { id: 'people', title: 'Agent', type: 'multiple-person' },
		    { id: 'status9', title: 'Stage', type: 'color' },
		    { id: 'status02', title: 'Bursar Stage', type: 'color' },
		    { id: 'connect_boards3', title: 'Leads', type: 'board-relation' },
		    { id: 'mirror75', title: 'Email', type: 'lookup' },
		    { id: 'text0', title: 'Voc Counselor Email', type: 'text' },
		    { id: 'mirror31', title: 'Phone Number', type: 'lookup' },
		    { id: 'mirror044', title: 'Forecast', type: 'lookup' },
		    { id: 'formula', title: 'Forecast Sum', type: 'formula' },
		    {
		      id: 'connect_boards',
		      title: 'Enrollment Database v2.0',
		      type: 'board-relation'
		    },
		    { id: 'status0', title: 'TCEF', type: 'color' },
		    { id: 'mirror00', title: 'Address', type: 'lookup' },
		    { id: 'mirror53', title: 'City', type: 'lookup' },
		    { id: 'mirror51', title: 'State', type: 'lookup' },
		    { id: 'mirror91', title: 'Zip', type: 'lookup' },
		    { id: 'mirror38', title: 'First Name', type: 'lookup' },
		    { id: 'mirror306', title: 'Last Name', type: 'lookup' },
		    { id: 'mirror64', title: 'SSN', type: 'lookup' },
		    { id: 'mirror357', title: 'DOB', type: 'lookup' },
		    { id: 'mirror479', title: 'Type', type: 'lookup' },
		    { id: 'mirror5', title: 'Funding', type: 'lookup' },
		    { id: 'mirror86', title: 'Visa Status', type: 'lookup' },
		    {
		      id: 'mirror47',
		      title: 'High School Graduation Date',
		      type: 'lookup'
		    },
		    { id: 'mirror72', title: 'Education Level', type: 'lookup' },
		    { id: 'mirror94', title: 'Picture', type: 'lookup' },
		    { id: 'mirror793', title: 'Essay', type: 'lookup' },
		    { id: 'mirror918', title: 'ID', type: 'lookup' },
		    { id: 'mirror11', title: 'Diploma', type: 'lookup' },
		    { id: 'mirror_1', title: 'COE', type: 'lookup' },
		    { id: 'mirror66', title: 'Social Security Card', type: 'lookup' },
		    { id: 'mirror78', title: 'DD-214', type: 'lookup' },
		    {
		      id: 'mirror461',
		      title: 'I-20 Creation and Delivery',
		      type: 'lookup'
		    },
		    { id: 'mirror476', title: '$32,000 Proof', type: 'lookup' },
		    { id: 'mirror_13', title: 'Credential Evaluation', type: 'lookup' },
		    { id: 'mirror0', title: 'Enrolment Agreement', type: 'lookup' },
		    { id: 'mirror004', title: 'Location Preference', type: 'lookup' },
		    { id: 'mirror0046', title: 'Travel Preference', type: 'lookup' },
		    {
		      id: 'dup__of_enrolment_agreement',
		      title: 'VA Certification',
		      type: 'lookup'
		    },
		    { id: 'mirror21', title: 'Tuition', type: 'lookup' },
		    { id: 'mirror19', title: 'Materials Fee', type: 'lookup' },
		    { id: 'mirror60', title: 'Technology Fee', type: 'lookup' },
		    { id: 'mirror88', title: 'Total Cost', type: 'lookup' },
		    { id: 'mirror83', title: 'Start Date', type: 'lookup' },
		    { id: 'mirror90', title: 'End Date', type: 'lookup' },
		    { id: 'mirror82', title: 'Delivery', type: 'lookup' },
		    {
		      id: 'connect_boards0',
		      title: 'Program Term',
		      type: 'board-relation'
		    },
		    { id: 'subitems', title: 'Subitems', type: 'subtasks' },
		    { id: 'mirror772', title: 'Program', type: 'lookup' },
		    { id: 'mirror216', title: 'Program Preference', type: 'lookup' },
		    {
		      id: 'link_to_leads',
		      title: 'link to Leads',
		      type: 'board-relation'
		    },
		    { id: 'checkbox', title: 'Create in Populi', type: 'boolean' },
		    { id: 'text7', title: 'Populi Link', type: 'text' }
		  ]
		}*/
	});

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

	/*it('should get the public url for the image', function(done) {
		this.timeout(5000);
		monday.getImageUrl('434716177').then(res => {
			console.log(res)
			done();
		});
	});*/

	/*it('should get students for creation in populi', function(done) {
		this.timeout(10000);
		monday.getStudentsForPopuliCreation().then(res => {
			// console.log(res);
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
			},
		];

		monday.insertUniqueLead(leads).then(res => {
			// console.log(res)
			done();
		});
	});*/
});