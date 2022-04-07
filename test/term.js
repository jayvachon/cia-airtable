require('should');
const term = require('../services/term');

describe('Term', () => {
	it('should refresh the current term', function(done) {
		this.timeout(10000);
		term.refreshCurrentTerm().then(currentTerm => {
			console.log(currentTerm)
			done();
		})
		.catch(err => {
			console.log(err)
		});

	});

	/*it('should get the current term', done => {
		const currentTerm = term.getCurrentTerm();
		done();
	})*/
});