const appRoot = require('app-root-path');
require('dotenv').config({path:`${appRoot}/.env`});
const xmlConvert = require('xml-js');
const Bottleneck = require('bottleneck');
const got = require('got');
const logger = require(`${appRoot}/config/winston`);
const fileUploader = require('./fileUploader');
const _ = require('lodash');

const ROOT = 'https://api.monday.com/v2';
const BOARD = '2134845746';
const TERM_BOARD = '2199255493';
const GROUP = { // The IDs of each group. IDs cannot be changed after groups are created in Monday, which is why these ID names are so weird and bad
	new: 'new_group22902',
	enrolling: 'new_group',
	enrolled: 'topics',
};
const COLUMN = { // The IDs of each column. Call getColumns() to add more
	email: 'email',
	firstName: 'text',
	lastName: 'text2',
	type: 'type',
	financialAid: 'status_11',
	dateAdded: 'date4',
	phone: 'phone',
	term: 'connect_boards8',
	course: 'status_15',
	status: 'status',
	socialSecurityNumber: 'text1',
	dateOfBirth: 'date_1',
	graduationDate: 'date',
	street: 'text4',
	city: 'text27',
	state: 'text3',
	zip: 'text01',
	educationLevel: 'dropdown',
	visa: 'status_113',

	essay: 'files8',
	identification: 'files7',
	diploma: 'files6',
	credentialEvaluation: 'files62',
	dd214: 'files4',
	coe: 'files9',
	proof32k: 'files75',
	affidavit: 'files76',
	f1: 'files71',
	i20transfer: 'files46',
	i20creationAndDelivery: 'files1',
	i20: 'files85',
};
const TERM_COLUMN = {
	name: 'name',
	startDate: 'date_4', // start and end date id's might need to be switched
	endDate: 'date_1',
}
const CURRENT_TERM = 2199255521; // Summer 2022

const mapColumnIds = (columnValues, asArray) => {

	// Takes the column values as returned by Monday
	// and maps them to the sensible names mapped out in COLUMN

	const mapped = _.chain(columnValues)
		.map(cv => {
			let key = _.findKey(COLUMN, item => {
				return item === cv.id;
			});
			return {
				id: key,
				text: cv.text,
			};
		})
		.filter(cv => cv.id !== undefined)
		.value();

	if (asArray) {
		return mapped;
	} else {
		return _.chain(mapped)
		    .keyBy('id')
		    .mapValues('text')
		    .value();
	}
};

const client = got.extend({
	// hooks: before
});

const limiter = new Bottleneck({
	minTime: 333,
});

const getAccessToken = () => {
	let token = process.env.MONDAY_ACCESS_TOKEN;
	if (token === undefined) {
		throw new Error('The Monday access token (MONDAY_ACCESS_TOKEN) has not been specified in the .env file');
	} else {
		return token;
	}
};

const formatDate = (date) => {
	return new Date(date).toISOString().split('T')[0];
}

const getTerms = () => {
	const q = `query {
		boards (ids: ${TERM_BOARD}) {
			items {
				id
				name
			}
			columns {
				id
			}
		}
	}`;
	return post(q).then(res => {
		return res.data.boards[0].items;
	});
};

const getGroups = () => {
	let query = `query {
	    boards (ids: ${BOARD}) {
	        groups {
	        	id
	            title
	        }
	    }
	}`;
	return post(query).then(res => {
		return res.data.boards[0].groups;
	});
};

const getColumns = () => {
	const query = `query {
	    boards (ids: ${BOARD}) {
	        columns {
	            id
	            title
	            type
	        }       
	    }
	}`;
	return post(query).then(res => {
		return res.data.boards[0];
	});
};

const getOrCreateLead = (email) => {
	console.log('get or create: ' + email)
	return getLead(email)
		.then(values => {
			console.log('values: ' + JSON.stringify(values))
			if (values) {
				return values;
			} else {
				const lead = {
					content: {
						email: email,
						studentType: 'Not Specified',
						program: 'Not Specified',
					}
				}
				return createLead(lead)
					.then(data => {
						console.log('create: ' + JSON.stringify(lead))
						return getLeadById(data.create_item.id);
					});
			}
		})
};

const getLead = (email) => {
	const query = `query {
	    items_by_column_values (board_id: ${BOARD}, column_id: "${COLUMN.email}", column_value: "${email}") {
	        id
	        column_values {
	        	id
	        	value
	        	text
	        }
	    }
	}`;
	return post(query)
		.then(res => {
			if (res.data.items_by_column_values.length === 0) {
				return undefined;
			}
			else {
				let values = mapColumnIds(res.data.items_by_column_values[0].column_values)
				values.id = res.data.items_by_column_values[0].id;

				// Censor sensitive information (with the exception of the keys in the following array)
				const includeKeys = [
					'status',
					'email',
					'firstName',
					'course',
					'type',
					'financialAid',
					'visa',
					'id',
				];
				let censoredLead = {};
				_.forOwn(values, (v, k) => {
					if (includeKeys.includes(k)) {
						censoredLead[k] = v;
					} else {
						censoredLead[k] = v === "" ? "" : "*";
					}
				});

				return censoredLead;
			}
		})
		.catch(err => {
			throw new Error(err);
		});
	// example output: {
	//   status: 'New',
	//   email: 'jay.vachon@codeimmersives.com',
	//   phone: '9876541234',
	//   lastName: 'Mctest',
	//   firstName: 'Test',
	//   dateAdded: '2022-01-24 19:00',
	//   dateOfBirth: '2022-01-24 19:00',
	//   term: 'Summer 2022',
	//   course: 'Associate of Science in Computer Science and Web Architecture',
	//   type: 'American Veteran',
	//   financialAid: 'Other - veteran'
	// }
};

const getLeadById = (id) => {
	const query = `query {
	    items (ids: [${id}]) {
	    	id
	        column_values {
	        	id
	        	value
	        	text
	        }
	    }
	}`;
	return post(query).then(res => {
		let values = mapColumnIds(res.data.items[0].column_values);
		values.id = res.data.items[0].id;
		return values;
	});
}

const insertUnique = (leads) => {

	// Filter out duplicate emails
	leads = _.uniqBy(leads, 'content.email');

	let q = `query {
		boards (ids: ${BOARD}) {
			items {
				id
				name
				column_values (ids: ${COLUMN.email}) {
					id
					value
				}
			}
		}
	}`;

	return post(q).then(res => {
		
		// Get a list of the emails that have already been added to the board
		let emails = _.map(res.data.boards[0].items, item => {
			let value = JSON.parse(item.column_values[0].value);
			if (value === null) {
				return '';
			} else {
				return value.email;
			}
		});

		// Disregard any blank items
		emails = _.filter(emails, email => email !== '');
		
		return emails;
		// example output: [ 'jay.vachon@codeimmersives.com', 'test@codeimmersives.com' ]
	})
	.then(existingEmails => {

		return {
			// Leads making first contact
			initial: _.filter(leads, lead => !_.includes(existingEmails, lead.content.email.toLowerCase())),

			// Leads who are filling out the form again
			repeat: _.filter(leads, lead => _.includes(existingEmails, lead.content.email.toLowerCase())),
		};

		// example output:
		// {
		//   initial: [ { id: '3', content: [Object] } ],
		//   repeat: [ { id: '0', content: [Object] }, { id: '1', content: [Object] } ]
		// }
	})
	.then(newLeads => {
		return Promise.all(_.map(newLeads.initial, newLead => createLead(newLead)))
			.then(() => { return newLeads; });
	})
	.catch(err => {
		logger.error(err);
		throw new Error(err);
	});
};

const createLead = (lead) => {

	let vals = {};

	const currentTerm = CURRENT_TERM;
	const today = new Date().toISOString().split('T')[0];
	vals[COLUMN.dateAdded] = { date: today, time: "00:00:00" };

	const email = lead.content.email;
	vals[COLUMN.email] = { email: email, text: email };

	let itemName = '';

	if (lead.content.firstName) {
		const firstName = lead.content.firstName.toLowerCase();
		const firstNameFormatted = firstName.charAt(0).toUpperCase() + firstName.slice(1);
		vals[COLUMN.firstName] = firstNameFormatted;
	}
	if (lead.content.lastName) {
		const lastName = lead.content.lastName.toLowerCase();
		const lastNameFormatted = lastName.charAt(0).toUpperCase() + lastName.slice(1);
		vals[COLUMN.lastName] = lastNameFormatted;
	}
	if (lead.content.firstName && lead.content.lastName) {
		itemName = `${firstNameFormatted} ${lastNameFormatted}`;
	}
	else {
		itemName = email;
	}

	let isVeteran = false;
	let normalizedType = lead.content.studentType.toLowerCase();
	let type = 'American Civilian';
	if (normalizedType.includes('veteran')) {
		type = 'American Veteran';
		isVeteran = true;
	}
	if (normalizedType.includes('international')) {
		type = 'International';
	}
	if (normalizedType.includes('not specified')) {
		type = 'Not Specified';
	}
	vals[COLUMN.type] = { label: type };

	let finAid = 'None'
	if (isVeteran) {
		if (normalizedType.includes('31')) {
			finAid = 'Chapter 31';
		}
		else if (normalizedType.includes('33')) {
			finAid = 'Chapter 33';
		}
		else if (normalizedType.includes('35')) {
			finAid = 'Chapter 35';
		}
		else if (normalizedType.includes('veteran')) {
			finAid = 'Other - veteran';
		}
	}
	vals[COLUMN.financialAid] = { label: finAid };

	let program = 'Not Specified';
	if (lead.content.program) {
		if (lead.content.program.toLowerCase() === 'javascript - web development') {
			program = 'Web Development Immersive Certificate';
		}
		if (lead.content.program.toLowerCase().includes('associate')) {
			program = 'Associate of Science in Computer Science and Web Architecture';
		}
	}
	vals[COLUMN.course] = { label: program };
	vals[COLUMN.status] = { label: 'New' };

	if (lead.content.phone) {
		vals[COLUMN.phone] = { phone: lead.content.phone };
	}
	vals[COLUMN.term] = { item_ids: [currentTerm] };

	const json = JSON.stringify(JSON.stringify(vals));
	const q = `mutation {
	    create_item (
	    	board_id: ${BOARD},
	    	group_id: "${GROUP.new}",
	    	item_name: "${itemName}",
	    	column_values: ${json}) {

	        id
	    }
	}`;
	return post(q)
		.then(res => {
			// console.log(res);
			return res.data;
		})
		.catch(err => {
			logger.error(err);
			throw new Error(err);
		});
}

const updateLeadValues = (leadId, columnValues) => {

	/* columnValues ex:
		{ 
			'socialSecurityNumber': '999999999',
			'phone': '9999999999',
		}
	*/

	if (columnValues.dateOfBirth) {
		columnValues.dateOfBirth = formatDate(columnValues.dateOfBirth);
	}
	if (columnValues.graduationDate) {
		columnValues.graduationDate = formatDate(columnValues.graduationDate);
	}

	const vals = _.mapKeys(columnValues, (v, k) => COLUMN[k]);
	const json = JSON.stringify(JSON.stringify(vals));
	const q = `mutation {
	  change_multiple_column_values(item_id: ${leadId}, board_id: ${BOARD}, column_values: ${json}) {
	    id
	  }
	}`
	return post(q)
		.then(res => {
			return res.data;
		})
		.catch(err => {
			logger.error(err);
			throw new Error(err);
		})
};

const uploadLeadDocument = (leadId, documentType, file) => {

	// documentType matches the name of the column
	return fileUploader.upload(Number(leadId), COLUMN[documentType], file);
}

const test = () => {
	return post('{ boards (limit:1) {id name} }');
};

const post = (query) => {
	return limiter.schedule(() => {
		return client(ROOT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			    'Authorization': getAccessToken(),
			},
		    body: JSON.stringify({
		    	'query': query,
		    }),
		})
		.then(response => {
			return JSON.parse(response.body);
		})
		.catch(err => {
			logger.error(err);
			throw new Error(err);
		});
	});
};

module.exports = {
	getAccessToken,
	getGroups,
	getColumns,
	getOrCreateLead,
	getLead,
	getLeadById,
	createLead,
	getTerms,
	insertUnique,
	updateLeadValues,
	uploadLeadDocument,
	test,
};