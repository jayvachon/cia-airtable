const dotenv = require('dotenv');
const airtable = require('../airtable');
const populi = require('./populi');
const _ = require('lodash');
const constants = require('../constants');

const tags = {

	// Students are tagged with the program they're in. These are updated every term!
	production: {
		python: '446549',
		wdi: '446550',
	},
	development: {
		python: '433046',
		wdi: '413894',
	},
};

const leadInfo = {
	production: {
		admissions_officer_id: '23356676',
		program_id: {
			python: '35666',
			wdi: '35366',
		},
		term_id: '273980',
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

		// only process one for now
		/*if (student.fields['Legal Last Name'] !== "Kittel") {
			return false;
		}
		return true;*/

		if (student.fields['Legal Last Name'] === 'Cecil' || student.fields['Legal Last Name'] === 'Hagstrom') {
			return true;
		} else {
			return false;
		}
	});
};

const prep = (newStudents, leads) => {
	return Promise.all(_.map(newStudents, newStudent => {

		// Connect Lead and Accepted Student Info
		let newLead = _.find(leads, lead => {
			if (lead.fields['3. Accepted Student Info'] === undefined) return false;
			return lead.fields['3. Accepted Student Info'][0] === newStudent.id;
		});

		if (!newLead) {
			throw new Error(`The student ${newStudent.fields['Legal Last Name']} has not been linked to a leads record`)
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

		let tag = '';
		let program = newLead.fields['Program'];
		let programShort = ''
		if (program.includes('Python')) {
			programShort = 'python';
		}
		if (program.includes('Javascript')) {
			programShort = 'wdi';
		}
		tag = tags[process.env.NODE_ENV][programShort];

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
			state: newStudent.fields.State,
			postal: newStudent.fields['Zip Code'],
			country: newStudent.fields.Country,
			'Email': newLead.fields['Email'],
			image: image,
			tag: tag,
			program: program,
			programShort: programShort,
			leadInfo: leadInfo[process.env.NODE_ENV],
			educationLevel: educationLevel,
			highSchoolGradDate: newStudent.fields['High School Graduation Date'],
			application: application[process.env.NODE_ENV],
		};

		return profile;
	}));
};

// deprecate this
const createInPopuli = (newStudents, leads) => {
	return Promise.all(_.map(newStudents, newStudent => {

		// Connect Lead and Accepted Student Info
		let newLead = _.find(leads, lead => {
			if (lead.fields['3. Accepted Student Info'] === undefined) return false;
			return lead.fields['3. Accepted Student Info'][0] === newStudent.id;
		});

		if (!newLead) {
			throw new Error(`The student ${newStudent.fields['Legal Last Name']} has not been linked to a leads record`)
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

		let profile = {
			'First Name': newStudent.fields['Legal First Name'],
			'Last Name': newStudent.fields['Legal Last Name'],
			'Birth Date': newStudent.fields['Birth Date'],
			'Phone Number': phone,
			'Social Security Number': newStudent.fields['Social Security Number'],
			street: newStudent.fields.Street,
			city: newStudent.fields.City,
			state: newStudent.fields.State,
			postal: newStudent.fields['Zip Code'],
			country: newStudent.fields.Country,
			'Email': newLead.fields['Email'],
			image: image,
			// tag // program

		};

		return populi.addPerson(profile)
			.then(id => {
				return airtable.addPopuliLink(newStudent.id, `${constants[process.env.NODE_ENV].WEB_ROOT}router/contacts/people/${id}`)
			});
	}))
};

// deprecate this
const create = () => {
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
		.then(newStudents => createInPopuli(newStudents, tables.leads));
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
		.then(profiles => Promise.all(_.map(profiles, profile => {
			return populi.addPerson(profile)
				.then(id => {
					return airtable.addPopuliLink(profile.airtableId, `${constants[process.env.NODE_ENV].WEB_ROOT}router/contacts/people/${id}`)
				});
			})));
};

module.exports = {
	preview,
	create,
	create2,
};