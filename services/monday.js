const appRoot = require('app-root-path');
require('dotenv').config({path:`${appRoot}/.env`});
const xmlConvert = require('xml-js');
const Bottleneck = require('bottleneck');
const got = require('got');
const logger = require(`${appRoot}/config/winston`);
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
};
const TERM_COLUMN = {
	name: 'name',
	startDate: 'date_4', // start and end date id's might need to be switched
	endDate: 'date_1',
}
const CURRENT_TERM = 2199255521; // Summer 2022

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

const getLead = (email) => {
	const query = `query {
	    items_by_column_values (board_id: ${BOARD}, column_id: "${COLUMN.email}", column_value: "${email}") {
	        id
	    }
	}`;
	return post(query).then(res => {
		return res.data.items_by_column_values;
	});
	// example output: [ { id: '2136020550' } ]
};

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

	const currentTerm = CURRENT_TERM;
	const today = new Date().toISOString().split('T')[0];
	const firstName = lead.content.firstName.toLowerCase();
	const firstNameFormatted = firstName.charAt(0).toUpperCase() + firstName.slice(1);
	const lastName = lead.content.lastName.toLowerCase();
	const lastNameFormatted = lastName.charAt(0).toUpperCase() + lastName.slice(1);
	
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

	let program = 'Not Specified';
	if (lead.content.program) {
		if (lead.content.program.toLowerCase() === 'javascript - web development') {
			program = 'Web Development Immersive Certificate';
		}
		if (lead.content.program.toLowerCase().includes('associate')) {
			program = 'Associate of Science in Computer Science and Web Architecture';
		}
	}

	const email = lead.content.email;
	const vals = {
		[COLUMN.email]: { email: email, text: email },
		[COLUMN.firstName]: firstNameFormatted,
		[COLUMN.lastName]: lastNameFormatted,
		[COLUMN.type]: { label: type },
		[COLUMN.financialAid]: { label: finAid },
		[COLUMN.phone]: { phone: lead.content.phone },
		[COLUMN.dateAdded]: { date: today, time: "00:00:00" },
		[COLUMN.term]: { item_ids: [currentTerm] },
		[COLUMN.course]: { label: program },
		[COLUMN.status]: { label: 'New' },
	};
	const json = JSON.stringify(JSON.stringify(vals));
	const q = `mutation {
	    create_item (
	    	board_id: ${BOARD},
	    	group_id: "${GROUP.new}",
	    	item_name: "${firstNameFormatted} ${lastNameFormatted}",
	    	column_values: ${json}) {

	        id
	    }
	}`;
	return post(q)
		.then(res => {
			console.log(res);
			return res.data;
		})
		.catch(err => {
			logger.error(err);
			throw new Error(err);
		});
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
	getLead,
	createLead,
	getTerms,
	insertUnique,
	test,
};