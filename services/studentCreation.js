const dotenv = require('dotenv');
const airtable = require('../airtable');
const populi = require('./populi');
const _ = require('lodash');
const constants = require('../constants');
const appRoot = require('app-root-path');
const logger = require(`${appRoot}/config/winston`);
const fs = require('fs');

const tags = {

	// Students are tagged with the program they're in. These are updated every term!
	production: {
		python: '448278',
		wdi: '448288',
		as:'',
	},
	development: {
		python: '433046',
		wdi: '413894',
		// as: ','
	},
};

const leadInfo = {
	production: {
		admissions_officer_id: '23356676',
		program_id: {
			python: '35666',
			wdi: '35366',
			as: '35348',
		},
		term_id: '283058',
		ed_level: {
			high_school: '3',
			some_college: '4',
			associates: '5',
			bachelors: '6',
			masters: '7',
			doctoral: '8',
		},
	},
	development: {
		admissions_officer_id: '23356676',
		program_id: {
			python: '35666',
			wdi: '35366',
			as: 'XXXX',
		},
		term_id: '283070',
		ed_level: {
			high_school: '3',
			some_college: '4',
			associates: '5',
			bachelors: '6',
			masters: '7',
			doctoral: '8',
		},
	},
};

const application = {
	production: {
		application_template_id: '34334',
		email_link_to_applicant: 'true',
	},
	development: {
		application_template_id: '34334',
		email_link_to_applicant: 'false',
	},
};

const findNewStudents = (info) => {
	return _.filter(info, student => {
		if (student.fields.Populi !== undefined) {
			return false;
		}
		return true;
	});
};

const prep = (newStudents, leads) => {

	return _.map(newStudents, newStudent => {

		// Connect Lead and Accepted Student Info
		let newLead = _.find(leads, lead => {
			if (lead.fields['3. Accepted Student Info'] === undefined) return false;
			return lead.fields['3. Accepted Student Info'][0] === newStudent.id;
		});

		if (!newLead) {
			// throw new Error(`The student ${newStudent.fields['Legal Last Name']} has not been linked to a leads record`)
			// return { error: `The student ${newStudent.fields['Legal Last Name']} has not been linked to a leads record` };
			return {
				error: `The student ${newStudent.fields['Email Last Name']} has not been linked to a leads record and will be skipped.`,
			};
		}

		// Format phone number
		let phone = '';
		if (newLead.fields['Phone']) {
			phone = newLead.fields['Phone'].replace('(','').replace(')','').replace(' ','').replace('-','');
			phone = phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
		}

		// Allow images to not be uploaded
		let image = undefined;
		if (newStudent.fields['Photo'] !== undefined && newStudent.fields['Photo'].length > 0) {
			image = newStudent.fields['Photo'][0].url;
		}

		// Standardize address
		let country = newStudent.fields.Country;
		if (country.toLowerCase() === 'united states' || country.toLowerCase() === 'us') {
			country = 'US';
		}

		let state = newStudent.fields.State;
		if (state.toLowerCase() === 'other') {
			state = newStudent.fields['Other State'];
		}

		let settings = JSON.parse(fs.readFileSync('settings.json'));
		let tag = '';
		let tagName = '';
		let program = newLead.fields['Program'];
		let programShort = ''

		// v2. Taken from settings
		if (program.includes('Associate')) {
			tag = settings.current_associates_tag.id;
			tagName = settings.current_associates_tag.name;
			programShort = 'as';
		}
		else if (program.includes('Javascript')) {
			tag = settings.current_certificate_tag.id;
			tagName = settings.current_certificate_tag.name;
			programShort = 'wdi';
		}
		leadInfo.term_id = settings.current_academic_term.id;

		let educationLevel = '';
		switch(newStudent.fields['Education Level']) {
			case 'High School Diploma': educationLevel = leadInfo[process.env.NODE_ENV].ed_level.high_school; break;
			case 'Some College': educationLevel = leadInfo[process.env.NODE_ENV].ed_level.some_college; break;
			case 'Associate\'s Degree': educationLevel = leadInfo[process.env.NODE_ENV].ed_level.associates; break;
			case 'Bachelor\'s Degree': educationLevel = leadInfo[process.env.NODE_ENV].ed_level.bachelors; break;
			case 'Master\'s Degree': educationLevel = leadInfo[process.env.NODE_ENV].ed_level.masters; break;
			case 'Doctoral Degree': educationLevel = leadInfo[process.env.NODE_ENV].ed_level.doctoral; break;
			default: educationLevel = leadInfo[process.env.NODE_ENV].ed_level.high_school; break;
		}

		let profile = {
			airtableId: newStudent.id,
			'First Name': newStudent.fields['Legal First Name'],
			'Last Name': newStudent.fields['Legal Last Name'],
			'Birth Date': newStudent.fields['Birth Date'],
			'Phone Number': phone,
			'Social Security Number': newStudent.fields['Social Security Number'],
			street: newStudent.fields.Street,
			city: newStudent.fields.City,
			state: state,
			postal: newStudent.fields['Zip Code'],
			country: country,
			'Email': newLead.fields['Email'],
			image: image,
			tag: tag,
			tagName: tagName,
			program: program,
			programShort: programShort,
			leadInfo: leadInfo[process.env.NODE_ENV],
			termName: settings.current_academic_term.name,
			educationLevel: educationLevel,
			highSchoolGradDate: newStudent.fields['High School Graduation Date'],
			application: application[process.env.NODE_ENV],
			error: '',
		};

		return profile;
	});
};

const preview = () => {
	let tables = {};
	return Promise.all([airtable.listLeads(), airtable.listDocs(), airtable.listInfo()])
		.then((values) => {
			_.forEach(values, v => {
				tables[v.name] = _.map(v.data, d => {
					return {
						id: d.id,
						fields: d.fields,
					};
				});
			})
			return tables;
		})
		.then(tables => findNewStudents(tables.info))
		.then(newStudents => prep(newStudents, tables.leads));
};

const create2 = () => {
	let tables = {};
	return Promise.all([airtable.listLeads(), airtable.listDocs(), airtable.listInfo()])
		.then((values) => {
			_.forEach(values, v => {
				tables[v.name] = _.map(v.data, d => {
					return {
						id: d.id,
						fields: d.fields,
					};
				});
			})
			return tables;
		})
		.then(tables => findNewStudents(tables.info))
		.then(newStudents => prep(newStudents, tables.leads))
		.then(profiles => Promise.all(
			_.map(profiles, profile => {

				if (profile.error === '') {
					return populi.addPerson(profile)
						.then(id => {
							return airtable.addPopuliLink(profile.airtableId, `${constants[process.env.NODE_ENV].WEB_ROOT}router/contacts/people/${id}`)
						});
				} else {
					return Promise.resolve();
				}

				})
			));
};

module.exports = {
	preview,
	create2,
};
