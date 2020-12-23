require('dotenv').config({path: __dirname + '/.env'});
const constants = require('../constants');
const got = require('got');
const FormData = require('form-data');
const xmlConvert = require('xml-js');

const client = got.extend({
	// hooks: before
});

const getAccessToken = (username, password) => {
	
	let url = constants[process.env.NODE_ENV].ROOT;

	if (!username || !password) {
		throw new Error('Cannot get access token because a username and password have not been provided');
	}

	let form = [
		`username=${username}`,
		`password=${password}`,
	];
	form = form.join('&');

	const promise = client.post(url, {
		body: form,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	});

	return promise.then(response => {

		if (response.statusCode === 401) {
			return undefined;
		}

		if (response.statusCode !== 200) {
			throw new Error('Unable to fetch access token: ' + response.body);
		}

		const body = xmlConvert.xml2js(response.body, {compact: true}).response;
		return body.access_key._text;
	})
	.catch(err => console.error(err));
};

module.exports = {
	getAccessToken,
};