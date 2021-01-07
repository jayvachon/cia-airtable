const airtable = require('../airtable');
const populi = require('./populi');
const _ = require('lodash');
const got = require('got');
const constants = require('../constants');

const findNewStudents = (info) => {
	return _.filter(info, student => {
		// For now, only work with Barbosa
		if (student.fields.Populi !== undefined) {
			return false;
		} else {
			// Left off here: trying to add multiple students at a time
			return student.fields['Last Name'] === 'Kvak' || student.fields['Last Name'] === 'Leary';
		}
	});
};

// TODO
const image2base64 = (url) => {
	// got.stream(url);
	return fs.readFile(path, 'base64')
		.catch(err => console.error(err));
};

const createInPopuli = (newStudents, leads) => {
	return Promise.all(_.map(newStudents, newStudent => {

		// Connect Lead and Accepted Student Info
		let newLead = _.find(leads, lead => {
			if (lead.fields['3. Accepted Student Info'] === undefined) return false;
			return lead.fields['3. Accepted Student Info'][0] === newStudent.id;
		});

		// console.log(newStudent.fields.Photo[0]);
		
		let phone = '';
		if (newLead.fields['Phone']) {
			phone = newLead.fields['Phone'].replace('(','').replace(')','').replace(' ','').replace('-','');
			phone = phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
		}
		let profile = {
			'First Name': newStudent.fields['First Name'],
			'Last Name': newStudent.fields['Last Name'],
			'Birth Date': newStudent.fields['Birth Date'],
			'Phone Number': phone,
			'Social Security Number': newStudent.fields['Social Security Number'],
			street: newStudent.fields.Street,
			city: newStudent.fields.City,
			state: newStudent.fields.State,
			postal: newStudent.fields['Zip Code'],
			country: newStudent.fields.Country,
			'Email': newLead.fields['Email'],
			image: newLead.fields['Photo'][0], // TODO
		};
		console.log(profile);

		/*return populi.addPerson(profile)
			.then(id => {
				return airtable.addPopuliLink(newStudent.id, `${constants[process.env.NODE_ENV].WEB_ROOT}router/contacts/people/${id}`)
			});*/
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

module.exports = {
	create,
};