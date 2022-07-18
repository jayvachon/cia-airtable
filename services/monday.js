const appRoot = require('app-root-path');
require('dotenv').config({path:`${appRoot}/.env`});
const xmlConvert = require('xml-js');
const Bottleneck = require('bottleneck');
const got = require('got');
const logger = require(`${appRoot}/config/winston`);
const fileUploader = require('./fileUploader');
const _ = require('lodash');

const ROOT = 'https://api.monday.com/v2';
// const BOARD = '2601210843'; // carbon web's
const BOARD = '2134845746'; // jay's
const TERM_BOARD = '2601237584';
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
	picture: 'files5',
	ssc: 'files0',

	createInPopuli: 'checkbox',
	populiLink: 'text33',
};
const TERM_COLUMN = {
	name: 'name',
	startDate: 'date_1',
	endDate: 'date4',
	orientationDate: 'date',
	current: 'checkbox',
	wdiTag: 'text7',
	waTag: 'text73',
}
const CURRENT_TERM = 2601237706; // Fall 2022

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

const mapTermColumnIds = (columnValues, asArray) => {

	// Takes the column values as returned by Monday
	// and maps them to the sensible names mapped out in TERM_COLUMN

	const mapped = _.chain(columnValues)
		.map(cv => {
			let key = _.findKey(TERM_COLUMN, item => {
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
				column_values {
					id
					value
					text
				}
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

const getCurrentTerm = () => {
	return getTerms().then(terms => {
		const currentTerm = _.find(terms, term => {
			const cvs = term.column_values;
			const checkbox = _.find(cvs, cv => cv.id === TERM_COLUMN['current']);
			return checkbox.value !== null;
		});
		if (!currentTerm) {
			return Promise.reject(new Error('No current term has been selected'));
		}
		let cv = mapTermColumnIds(currentTerm.column_values);
		cv.name = currentTerm.name;
		cv.mondayId = currentTerm.id;
		return cv;
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

const getTermColumns = () => {
	const query = `query {
	    boards (ids: ${TERM_BOARD}) {
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

const getImageUrl = (assetId) => {
	const q = `query {
		assets(ids: [${assetId}]) {
			id
			name
			public_url
		}
	}`;
	return post(q).then(res => {
		return res.data.assets[0].public_url;
	})
};

const getStudentsForPopuliCreation = () => {
	const vals = {
		checked: true
	};
	const json = JSON.stringify(JSON.stringify(vals));
	const q = `query {
		items_by_column_values (board_id: ${BOARD}, column_id: "${COLUMN['status']}", column_value: "Finalized Documents") {
	        id
	        name
	        column_values {
	        	id
	        	value
	        	text
	        }
		}
	}`;
	return post(q).then(res => {

		// Early out if there are no students to create
		const items = res.data.items_by_column_values; // this is the line when using items_by_column_values as the query
		if (items.length === 0) {
			return [];
		}

		// Only return students that are marked as ready to be created
		const readyStudents = _.filter(items, item => {
			const checkbox = _.find(item.column_values, cv => cv.id === COLUMN['createInPopuli']); // marked as ready to be created AND...
			const populiLink = _.find(item.column_values, cv => cv.id === COLUMN['populiLink']); // ...hasn't already been created
			// console.log(checkbox)
			return checkbox.text !== '' && populiLink.text === '';
		});

		return Promise.all(_.map(readyStudents, item => {
				
			// monday files are only publicly accessible for an hour at a time, so it's necessary to get the temporary image url
			const assetId = JSON.parse(_.find(item.column_values, cv => cv.id === COLUMN['picture']).value).files[0].assetId;

			return getImageUrl(assetId)
				.then(publicUrl => {
					let student = mapColumnIds(item.column_values);
					student.mondayId = item.id;
					student.picture = publicUrl;
					return student;
				})
		}));
	});
};

const getOrCreateLead = (email) => {
	email = email.toLowerCase();
	console.log('get or create: ' + email)
	return getLead(email)
		.then(values => {
			console.log('values: ' + JSON.stringify(values, null, 4))
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
						console.log('create: ' + JSON.stringify(lead, null, 4))
						return getLeadById(data.create_item.id);
					});
			}
		})
};

const getLead = (email) => {
	email = email.toLowerCase();
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

	const email = lead.content.email.toLowerCase();
	vals[COLUMN.email] = { email: email, text: email };

	let itemName = '';
	let firstNameFormatted = '';
	let lastNameFormatted = '';

	if (lead.content.firstName) {
		const firstName = lead.content.firstName.toLowerCase();
		firstNameFormatted = firstName.charAt(0).toUpperCase() + firstName.slice(1);
		vals[COLUMN.firstName] = firstNameFormatted;
	}
	if (lead.content.lastName) {
		const lastName = lead.content.lastName.toLowerCase();
		lastNameFormatted = lastName.charAt(0).toUpperCase() + lastName.slice(1);
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
};

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
	getTermColumns,
	getOrCreateLead,
	getLead,
	getLeadById,
	getImageUrl,
	getStudentsForPopuliCreation,
	createLead,
	getTerms,
	getCurrentTerm,
	insertUnique,
	updateLeadValues,
	uploadLeadDocument,
	test,
};