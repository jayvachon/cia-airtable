const config = require('./config');
const _ = require('lodash');
const Airtable = require('airtable');

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: config.KEY,
});

const base = Airtable.base(config.BASE);

const add = (leads) => {
	return base('Leads')
	.create(leads, { typecast: true })
	.catch(err => {
		console.error(err);
	});
};

const insertUnique = (leads) => {
	
	// Remove duplicate new leads (for when people submit the form more than once)
	leads = _.uniqBy(leads, 'content.email');

	return base('Leads').select().firstPage().then(existing => {
		
		// Get all existing leads
		return _.map(existing, lead => lead.fields);
	})
	.then(existingLeads => {

		// Filter out leads that have already been added
		const existingEmails = _.map(existingLeads, existingLead => existingLead.Email);
		return _.filter(leads, lead => !_.includes(existingEmails, lead.content.email));
	})
	.then(newLeads => {

		const formatted = _.map(newLeads, lead => {
			return {
				fields: {
					'id': lead.id,
					'Email': lead.content.email,
					'Phone': lead.content.phone,
					'First Name': lead.content.firstName,
					'Last Name': lead.content.lastName,
					'Student Type': lead.content.status,
					'Financial Aid': lead.content.aid,
					'Term': 'Fall 2020',
					'Program': lead.content.program,
					'Message': lead.content.message,
					'Date added': new Date(),
				},
			};
		});

		// Airtable can only add a maxiumum of ten records at a time, so break up the list
		const chunked = _.chunk(formatted, 10);

		// add(formatted);
		return Promise.all(_.map(chunked, leads => {
			return add(leads);
		})).then(values => {
			return newLeads;
		});
	});
};

module.exports = {
	insertUnique,
};
