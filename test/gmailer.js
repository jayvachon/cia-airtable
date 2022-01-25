require('should');
const gmailer = require('../gmailer');
const _ = require('lodash');

describe('Gmailer', () => {

	/*it('should list messages with attachments', done => {

		gmailer.list().then(messages => {
			console.log(messages);
			done();
		});
	});*/

	/*it('should filter spam', done => {
		
		let entries = [
			{
				content: { firstName: 'Logan', lastName: 'Roy'},
				spam: false,
			},
			{
				content: { firstName: 'WilliamPioneAH', lastName: 'WilliamPione'},
				spam: true,
			},
			{
				content: { firstName: 'https://test.com', lastName: 'https://test.com' },
				spam: true,
			},
		];

		gmailer.filterSpam(entries, false).then(result => {
			// console.log(result);
			let spam = _.filter(result, entry => {
				return entry.spam === true;
			});
			if (spam.length > 0) {
				done(new Error(`The following spam was not deleted: ${JSON.stringify(spam)}`));
			}
			else {
				done();
			}
		});
	})*/
});