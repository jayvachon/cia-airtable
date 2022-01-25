require('should');
const monday = require('../services/monday');
// const appRoot = require('app-root-path');

describe('Monday', () => {

	it('should get the terms', done => {
		monday.getTerms().then(res => {
			console.log(res);
			done();
		});
	});

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

	it('should find a lead by email', done => {
		monday.getLead().then(res => {
			// console.log(res);
			done();
		})
	});*/
/*
	it('should list the columns', done => {
		monday.getColumns().then(res => {
			console.log(res);
			res.should.be.an.Object;
			done();
		})
	});*/

	/*it('should create a new lead', done => {
		monday.createLead().then(res => {
			console.log(res);
			done();
		})
	});*/
});