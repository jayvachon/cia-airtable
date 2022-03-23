require('should');
const studentCreation = require('../services/studentCreation');
const appRoot = require('app-root-path');

describe('Student Creation', () => {
	/*it('should create students', function(done) {
		this.timeout(10000);
		studentCreation.create().then(result => {
			console.log(result);
			done();
		});
	});*/

	it('should preview monday students', function(done) {
		studentCreation.preview_monday().then(result => {
			console.log(result);
			done();
		})
	});
});