require('should');
const tc = require('../services/transferCredit');
const appRoot = require('app-root-path');
const fs = require('fs');

describe('Transfer Credit', () => {

	it('should validate transfer credits', done => {
		const file = fs.readFileSync(`${appRoot}/samples/transfer-credit-real.xlsx`);
		tc.readXlsx(file).then(response => {
			// console.log(response)
			done();
		});
	});
});