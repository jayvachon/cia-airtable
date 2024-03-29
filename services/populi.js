const appRoot = require('app-root-path');
require('dotenv').config({path:`${appRoot}/.env`});
const _ = require('lodash');
const constants = require('../constants');
const tagService = require('./tags');
const Bottleneck = require('bottleneck');
const got = require('got');
const stream = require("stream");
const FormData = require('form-data');
const xmlConvert = require('xml-js');
const fs = require('promise-fs');
const path = require('path');
const imageToBase64 = require('image-to-base64');
const { createWriteStream } = require("fs");
const { promisify } = require("util");
const logger = require(`${appRoot}/config/winston`);

// TODO: give international students the "International" tag

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

const post = (path, keyvals, customToken) => {

	let token = customToken ?? constants[process.env.NODE_ENV].TOKEN;

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

			if (path === 'addProfilePicture') {
				console.log(response.body)
			}

			return { raw: response.body, js: xmlConvert.xml2js(response.body, {compact: true}).response };
		})
		.catch(err => {
			const msg = xmlConvert.xml2js(err.response.body, {compact: true}).error.message._text;
			logger.error(msg);
			throw new Error(msg);
		});
	});
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
			return post('addTag', {
					person_id: person.id,
					tag_id: tagService.get('location')
				})
				.then(() => post('addTag', {
					person_id: person.id,
					tag_id: tagService.get(person.programShort)
				}))
				.then(() => post('addTag', {
					person_id: person.id,
					tag_id: person.termId,
				}))
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

const addTransferCredit = (variableFields, token) => {

	let transferCreditDetails = {
		status: 'APPROVED',
		applies_to_all_programs: 'false',
		affects_standing: 'true',
		pass_fail_fail_affects_gpa: 'false',
		pass_fail_pass_affects_gpa: 'false',
		fail_affects_gpa: 'false',
		pass_affects_gpa: 'false',
		fulfills_program_requirements: 'true',


		organization_id: variableFields['Organization ID'],
		person_id: variableFields['Person ID'],
		course_number: variableFields['Course Number'],
		course_name: variableFields['Course Name'],
		catalog_course_id: variableFields['Catalog Course ID'],
		effective_date: variableFields['Effective Date'],
	};

	if (Number(variableFields.Credits) > 0) {
		transferCreditDetails.credits = variableFields.Credits;
	}
	if (Number(variableFields.Hours) > 0) {
		transferCreditDetails.hours = variableFields.Hours;
	}

	return post('addTransferCredit', transferCreditDetails, token)
		.then(response => {
			return response.js.id._text;
		})
		.catch(err => {
			throw new Error(err);
		});
};

const addTransferCreditProgram = (id, programId, grade, token) => {
	// console.log(id, programId, grade)
	return post('getTransferCreditProgramGradeOptions', { program_id: programId })
		.then(response => {
			const grades = _.map(response.js.grade_scale.option, option => { 
					return {
						value: option.value._text,
						label: option.label._text,
					}
				});
			const numberGrade = _.find(grades, g => g.label === grade).value;
			// console.log(id)
			// console.log(numberGrade)
			// console.log(JSON.stringify(response.js, null, 2))
			return post('addTransferCreditProgram', { transfer_credit_id: id, program_id: programId, grade: numberGrade, pass_fail: 'false' }, token)
				.then(response => {
					return response;
				})
				.catch(err => {
					throw new Error(err);
				});
		})

};

const findTag = (tagName) => {
	return post('getTags')
		.then(response => {
			let tags = _.map(response.js.tags.tag, tag => {
				return {
					id: tag.id._text,
					name: tag.name._text,
				};
			});
			return _.find(tags, tag => tag.name === tagName);
		})
};

const getAcademicTermByName = (termName) => {
	return post('getAcademicTerms')
		.then(response => {
			let terms = response.js.academic_term;
			let term = _.find(terms, term => {
				return term.name._text === termName;
			});
			if (!term) return undefined;
			return {
				id: term.termid._text,
				name: term.name._text,
				startDate: term.start_date._text,
				endDate: term.end_date._text,
			};
		})
		.catch(err => {
			throw new Error(err);
		});
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

const getAidApplicationForStudentAidYear = (studentId, aidYearId) => {
	return post('getAidApplicationForStudentAidYear', { student_id: studentId, aid_year_id: aidYearId })
		.then(response => {
			return response;
		})
		.catch(err => {
			throw new Error(err);
		});
};

const getCatalogCourse = (id) => {
	return post('getCatalogCourse', { catalog_course_id: id })
		.then(response => {
			return response.js;
		})
		.catch(err => {
			throw new Error(`No catalog course with the ID "${id}" exists`);
		});
}

const getFinancialAidYears = () => {
	return post('getFinancialAidYears')
		.then(years => {
			return _.map(years.js.aid_year, year => {
				return {
					id: year.id._text,
					name: year.name._text,
					startDate: year.start_date._text,
					endDate: year.end_date._text,
				}
			});
		})
		.catch(err => {
			throw new Error(err);
		});
};

const getOrganization = (id) => {
	return post('getOrganization', { organization_id: id })
		.then(response => {
			return response.js;
		})
		.catch(err => {
			throw new Error(`No organization with the ID "${id}" exists`);
		});
};

const getPerson = (id) => {
	return post('getPerson', { person_id: id })
		.then(response => {
			return response.js;
		})
		.catch(err => {
			throw new Error(`No person with the id "${id}" exists`);
		});
};

const getPrograms = () => {
	return post('getPrograms')
		.then(response => {
			return _.map(response.js.program, program => {
				return {
					id: program.id._text,
					name: program.name._text,
				};
			});
		})
		.catch(err => {
			throw new Error(err);
		});
};

const getRoleMembers = (roleName) => {
	return post('getRoleMembers', { roleName })
		.then(response => {
			return _.map(response.js.person, person => {
				return {
					id: person.personID._text,
					firstName: person.first._text,
					lastName: person.last._text,
					username: person.username._text,
				}
			});
		})
		.catch(err => {
			throw new Error(err);
		});
};

const getStudentInfo = (personId) => {
	return post('getStudentInfo', { person_id: personId })
		.then(studentInfo => {
			const info = studentInfo.js;
			return {
				studentId: info.student_id,
			};
		})
		.catch(err => {
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
			// tags = _.keyBy(tags, 'id');
			// tags = _.filter(tags, tag => tag.name.includes('/CS/'));
			return tags;
		})
		.catch(err => {
			throw new Error(err);
		})
};

const getTags_deprecated = () => {
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

const getUsers = () => {
	return post('getUsers')
		.then(response => {
			let users = _.map(response.js.person, person => {
				return {
					id: person.person_id._text,
					firstName: person.first._text,
					lastName: person.last._text,
					username: person.username._text,
				};
			});
			return users;
		})
		.catch(err => {
			throw new Error(err);
		});
};

const image2base64 = (url) => {

	return imageToBase64(url)
	    .then(base64 => {
            return base64;
        })
	    .catch(error => {
            console.error(error);
	    });
};

module.exports = {
	addPerson,
	addTransferCredit,
	addTransferCreditProgram,
	findTag,
	getAccessToken,
	getAcademicTermByName,
	getAcademicTerms,
	getAidApplicationForStudentAidYear,
	getCatalogCourse,
	getFinancialAidYears,
	getOrganization,
	getPerson,
	getPrograms,
	getRoleMembers,
	getStudentInfo,
	getTags,
	getTags_deprecated,
	getUsers,
	image2base64,
};
