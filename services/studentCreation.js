const airtable = require('../airtable');
const populi = require('./populi');
const _ = require('lodash');
const constants = require('../constants');

const findNewStudents = (info) => {
	return _.filter(info, student => {
		if (student.fields.Populi !== undefined) {
			return false;
		}

		// only process one for now
		if (student.fields['Legal Last Name'] !== "Bissell") {
			return false;
		}
		return true;
	});
};

const prep = (newStudents, leads) => {
	return Promise.all(_.map(newStudents, newStudent => {

		// Connect Lead and Accepted Student Info
		let newLead = _.find(leads, lead => {
			if (lead.fields['3. Accepted Student Info'] === undefined) return false;
			return lead.fields['3. Accepted Student Info'][0] === newStudent.id;
		});
		console.log(newStudent)

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
			program: newLead.fields['Program'],
		};

		return profile;
	}));
};

const createInPopuli2 = (profiles) => {
	return prep().then(profiles=> Promise.all(_.map(profiles, profile => {
		return populi.addPerson(profile)
			.then(id => {
				return airtable.addPopuliLink(newStudent.id, `${constants[process.env.NODE_ENV].WEB_ROOT}router/contacts/people/${id}`)
			});
		})));
};

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

module.exports = {
	preview,
	create,
	createInPopuli2,
};