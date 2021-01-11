const config = require('./config');
const _ = require('lodash');
const Airtable = require('airtable');

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: config.KEY,
});

const base = Airtable.base(config.BASE);

const add = (leads) => {
	return base('1. Leads')
	.create(leads, { typecast: true })
	.catch(err => {
		console.error(err);
	});
};

const insertUnique = (leads) => {
	
	// Remove duplicate new leads (for when people submit the form more than once)
	leads = _.uniqBy(leads, 'content.email');
	existing = [];

	return base('1. Leads')
	.select()
	.all()
	.then(existing => {
		
		// Get all existing leads
		return _.map(existing, lead => lead.fields);
	})
	.then(existingLeads => {

		// Filter out leads that have already been added
		const existingEmails = _.map(existingLeads, existingLead => {
			// existingLead.Email.toLowercase()
			let email = existingLead.Email;
			if (email) {
				return existingLead.Email.toLowerCase();
			} else {
				return '';
			}
		});
		// console.log(existingEmails);
		// console.log(JSON.stringify(_.includes(existingEmails, leads[0].content.email.toLowerCase())));

		// console.log(JSON.stringify(_.filter(leads, lead => _.includes(existingEmails, lead.content.email.toLowerCase()))));
		// return _.filter(leads, lead => !_.includes(existingEmails, lead.content.email.toLowercase()));
		return {
			// Leads making first contact
			initial: _.filter(leads, lead => !_.includes(existingEmails, lead.content.email.toLowerCase())),

			// Leads who are filling out the form again
			repeat: _.filter(leads, lead => _.includes(existingEmails, lead.content.email.toLowerCase())),
		};
	})
	.then(newLeads => {
		const formatted = _.map(newLeads.initial, lead => {
			return {
				fields: {
					'id': lead.id,
					'Email': lead.content.email,
					'Phone': lead.content.phone,
					'First Name': lead.content.firstName,
					'Last Name': lead.content.lastName,
					'Student Type': lead.content.studentType,
					'Financial Aid': lead.content.aid,
					'Term': 'Winter 2021',
					'Program': lead.content.program,
					'Message': lead.content.message,
					'Date added': new Date(),
					'Status': 'New',
				},
			};
		});

		// Airtable can only add a maxiumum of ten records at a time, so break up the list
		const chunked = _.chunk(formatted, 10);

		return Promise.all(_.map(chunked, chunk => {
			return add(chunk);
		})).then(values => {
			return newLeads;
		});
	});
};

const listLeads = () => {
	return base('1. Leads').select({ view: 'Interested' }).all().then(existing => {
		return { name: 'leads', data: existing };
	});
}

const listDocs = () => {
	return base('2. Docs').select({ view: 'Upcoming term' }).all().then(existing => {
		return { name: 'docs', data: existing };
	});
};

const listInfo = () => {
	return base('3. Accepted Student Info').select({ view: 'Grid view'}).all().then(existing => {
		return { name: 'info', data: existing };
	});
};

const addPopuliLink = (id, link) => {
	return base('3. Accepted Student Info').update([{
		'id': id,
		'fields': {
			'Populi': link,
		}
	}]);
};

module.exports = {
	insertUnique,
	listLeads,
	listDocs,
	listInfo,
	addPopuliLink,
};
