const appRoot = require('app-root-path');
require('dotenv').config({path:`${appRoot}/.env`});
const _ = require('lodash');
const constants = require('../constants');
const Bottleneck = require('bottleneck');
const got = require('got');
const FormData = require('form-data');
const xmlConvert = require('xml-js');
const fs = require('mz/fs');

const client = got.extend({
	// hooks: before
});

const limiter = new Bottleneck({
	minTime: 333,
});

const getUrl = () => {
	return constants[process.env.NODE_ENV].ROOT;
};

const getAccessToken = (username, password) => {
	
	let url = getUrl();

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

const post = (path, keyvals) => {

	let token = constants[process.env.NODE_ENV].TOKEN;

	if (!token) {
		throw new Error('You are not logged in');
	}

	if (_.some(Object.values(keyvals), _.isEmpty)) {
		throw new Error('One of the values provided is undefined, so the request cannot be completed: '+ JSON.stringify(keyvals))
	}

	let form = new FormData();
	form.append('access_key', token);
	form.append('task', path);
	_.mapKeys(keyvals, (val, key) => {
		form.append(key, val);
	});

	return limiter.schedule(() => {
		return client(getUrl(), {
			method: 'POST',
			'Content-Type': 'form-data',
			headers: form.getHeaders(), // not needed?
			body: form,
		})
		.then(response => {
			return { raw: response.body, js: xmlConvert.xml2js(response.body, {compact: true}).response };
		});
	});
};

const addPerson = (person) => {

	// left off here:
	// populi successfully finds duplicates based on first and last name
	// the next step is to add student information to the profile (phone number, address, etc)
	// and then to pull this information from airtable

	return post('getPossibleDuplicatePeople', { first_name: person['First Name'], last_name: person['Last Name'], birth_date: person['Birth Date'] })
		.then(response => {
			let duplicates = response.js.possible_duplicate;
			if (duplicates === undefined) {
				return post('addPerson', { first_name: person['First Name'], last_name: person['Last Name'], birth_date: person['Birth Date']  })
					.then(response => {
						person.id = response.js.id._text;
						return response;
					});
			} else {
				console.log(`${ person['First Name'] } ${ person['Last Name'] } already exists -- updating their information now`);
				let duplicate = {};
				if (_.isArray(duplicates)) {
					duplicate = duplicates[0];
				} else {
					duplicate = duplicates;
				}
				person.id = duplicate.id._text;
				return person;
			}
		})
		.then(response => {
			return post('setPersonSSN', { person_id: person.id, ssn: person['Social Security Number'] });
		})
		.then(response => {
			if (!person['Phone Number']) {
				return Promise.resolve();
			} else {
				return post('addPhoneNumber', { person_id: person.id, phone_number: person['Phone Number'], type: 'MOBILE', primary: 'true' });
			}
		})
		.then(response => {
			return post('addAddress', { person_id: person.id, street: person.street, city: person.city, state: person.state, postal: person.postal, country: person.country, type: 'HOME', primary: 'true' });
		})
		.then(response => {
			return post('addEmailAddress', { person_id: person.id, email_address: person['Email'], type: 'HOME', primary: 'true' })
		})
		.then(response => {
			return person.id;
		})
		.catch(err => {
			console.log(err);
			throw new Error(err);
		});
		// TODO
		/*.then(response => {
			return post('addProfilePicture', { person_id: person.id, image: person.image });
		})*/;
};

const image2base64 = (path) => {
	return fs.readFile(path, 'base64')
		.catch(err => console.error(err));
};

module.exports = {
	getAccessToken,
	addPerson,
	image2base64,
};