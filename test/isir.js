require('should');
const isir = require('../services/isir');

describe('ISIR', () => {
	it('should get financial aid year', done => {
		isir.getFinancialAidYear()
			.then(year => {
				console.log(year);
				done();
			});
	});

	it('should get all aid applications', function(done) {
		this.timeout(20000);
		isir.getNewAidApplications()
			.then(applications => {
				done();
			});
	});
});