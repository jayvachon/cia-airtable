const appRoot = require('app-root-path');
require('dotenv').config({path:`${appRoot}/.env`});
const _ = require('lodash');
const constants = require('../constants');
const Bottleneck = require('bottleneck');
const got = require('got');
const stream = require("stream");
const FormData = require('form-data');
const xmlConvert = require('xml-js');
const fs = require('promise-fs');
const path = require('path');
const { createWriteStream } = require("fs");
const { promisify } = require("util");
const logger = require(`${appRoot}/config/winston`);

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

	if (!keyvals) { keyvals = {}; }

	if (_.some(Object.values(keyvals), _.isEmpty)) {
		throw new Error('One of the values provided is undefined, so the request cannot be completed: '+ JSON.stringify(keyvals) + ' (it may be that the value needs to be turned into a string)')
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
		})
		.catch(err => {
			logger.error(err);
			throw new Error(err);
		});
	});
};

const image2base64 = (url) => {
	let filename = path.basename(url);
	const downloadStream = got.stream(url);
	const downloadPath = `${appRoot}/uploads/${filename}`;
	const fileWriterStream = createWriteStream(downloadPath);
	const pipeline = promisify(stream.pipeline);

	downloadStream
		.on('error', (error) => {
			console.error(`Download failed: ${error.message}`);
		});

	return pipeline(downloadStream, fileWriterStream)
		.then(() => {
			return fs.readFile(downloadPath, 'base64');
		})
		.catch((error) => console.error(`Something went wrong. ${error.message}`));
};

const addPerson = (person) => {

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
			if (!person['Social Security Number']) {
				return Promise.resolve();
			} else {
				return post('setPersonSSN', { person_id: person.id, ssn: person['Social Security Number'] });
			}
		})
		.then(response => {
			if (!person['Phone Number']) {
				return Promise.resolve();
			} else {
				return post('addPhoneNumber', { person_id: person.id, phone_number: person['Phone Number'], type: 'MOBILE', primary: 'true' });
			}
		})
		.then(response => {
			if (person.country !== 'US') {
				return Promise.resolve();
			} else {
				return post('addAddress', { person_id: person.id, street: person.street, city: person.city, state: person.state, postal: person.postal, country: person.country, type: 'HOME', primary: 'true' });
			}
		})
		.then(response => {
			console.log('email');
			return post('addEmailAddress', { person_id: person.id, email_address: person['Email'], type: 'HOME', primary: 'true' })
		})
		.then(response => {
			if (!person.image) {
				return Promise.resolve();
			} else {
				return image2base64(person.image).then(base64 => {
					return post('addProfilePicture', { person_id: person.id, image: base64 });
				});
			}
		})
		.then(response => {
			return post('addTag', { person_id: person.id, tag_id: person.tag });
		})
		.then(response => {
			return post('setLeadInfo', {
				person_id: person.id,
				admissions_officer_id: person.leadInfo.admissions_officer_id,
				status: 'PROSPECT',
				program_id: person.leadInfo.program_id[person.programShort],
				term_id: person.leadInfo.term_id,
				ed_level_id: person.educationLevel,
				high_school_grad_date: person.highSchoolGradDate,
			});
		})
		.then(response => {
			return post('addApplication', {
				person_id: person.id,
				application_template_id: person.application.application_template_id,
				representative_id: person.leadInfo.admissions_officer_id,
				program_id: person.leadInfo.program_id[person.programShort],
				academic_term_id: person.leadInfo.term_id,
			});
		})
		.then(response => {
			return person.id;
		})
		.catch(err => {
			console.log(err);
			logger.error(err);
			throw new Error(err);
		});
};

const getTags = () => {
	return post('getTags')
		.then(response => {
			let tags = _.map(response.js.tags.tag, tag => {
				return {
					id: tag.id._text,
					name: tag.name._text,
				};
			});
			tags = _.keyBy(tags, 'id');
			tags = _.filter(tags, tag => tag.name.includes('/CS/'));
			return tags;
		})
		.catch(err => {
			throw new Error(err);
		})
};

const getAcademicTerms = () => {
	return post('getAcademicTerms')
		.then(response => {
			let terms = response.js.academic_term;
			terms = _.map(terms, term => {
				return {
					id: term.termid._text,
					name: term.name._text,
				}
			})
			return terms;
		})
		.catch(err => {
			throw new Error(err);
		});
};

module.exports = {
	getAccessToken,
	addPerson,
	getTags,
	getAcademicTerms,
	image2base64,
};
