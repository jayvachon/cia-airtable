const appRoot = require('app-root-path');
require('dotenv').config({path:`${appRoot}/.env`});
const xmlConvert = require('xml-js');
const Bottleneck = require('bottleneck');
const got = require('got');
const logger = require(`${appRoot}/config/winston`);

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

const getLead = () => {
	let email = 'jay.vachon@codeimmersives.com';
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

const createLead = () => {
	const email = 'test@codeimmersives.com';
	const vals = {
		[COLUMN.email]: { email: email, text: email },
		[COLUMN.firstName]: 'First2',
		[COLUMN.lastName]: 'Last2',
		[COLUMN.type]: { label: 'American Veteran' },
		[COLUMN.financialAid]: { label: 'Chapter 33' },
		[COLUMN.phone]: { phone: '5555555555' },
		[COLUMN.dateAdded]: { date: new Date().toISOString().split('T')[0], time: "00:00:00" },
		// [COLUMN.term]: //
		[COLUMN.course]: { label: 'Associate of Science in Computer Science and Web Architecture' },
		[COLUMN.status]: { label: 'New' },
	};
	let json = JSON.stringify(JSON.stringify(vals));
	const q = `mutation {
	    create_item (
	    	board_id: ${BOARD},
	    	group_id: "${GROUP.new}",
	    	item_name: "lead_${email}",
	    	column_values: ${json}) {

	        id
	    }
	}`;
	return post(q).then(res => {
		return res.data;
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
	test,
};