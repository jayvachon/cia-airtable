const config = require('./config');
const _ = require('lodash');
const Airtable = require('airtable');
const fs = require('fs');

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: config.KEY,
});

const base = Airtable.base(config.BASE);

const getCurrentTerm = () => {
	return JSON.parse(fs.readFileSync('settings.json')).current_term;
};

const add = (leads) => {
	return base('1. Leads')
		.create(leads, { typecast: true })
		.catch(err => console.error(err));
};

const addLeadDoc = (leadDoc) => {
	return base('2. Docs')
		.create(leadDoc, { typecast: true })
		.catch(err => console.error(err));
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
			let email = existingLead.Email;
			if (email) {
				return existingLead.Email.toLowerCase();
			} else {
				return '';
			}
		});

		return {
			// Leads making first contact
			initial: _.filter(leads, lead => !_.includes(existingEmails, lead.content.email.toLowerCase())),

			// Leads who are filling out the form again
			repeat: _.filter(leads, lead => _.includes(existingEmails, lead.content.email.toLowerCase())),
		};
	})
	.then(newLeads => {
		const formatted = _.map(newLeads.initial, lead => {
			let currentTerm = getCurrentTerm();
			return {
				fields: {
					'id': lead.id,
					'Email': lead.content.email,
					'Phone': lead.content.phone,
					'First Name': lead.content.firstName,
					'Last Name': lead.content.lastName,
					'Student Type': lead.content.studentType,
					'Financial Aid': lead.content.aid,
					'Term': currentTerm.Name,
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
	return base('1. Leads').select({ view: 'Main' }).all().then(existing => {
		return { name: 'leads', data: existing };
	});
}

const listDocs = () => {
	return base('2. Docs').select({ view: 'Main' }).all().then(existing => {
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

const getTerms = () => {
	return base('Terms').select().all().then(records => {
		return _.map(records, record => {
			return {
				Name: record.fields.Name,
				'Start date': record.fields['Start date'],
				'End date': record.fields['End date'],
			};
		});
	});
};

const getLeadByEmail = (email) => {
	return listLeads().then(leads => {
		return _.find(leads.data, lead => lead.fields.Email === email);
	});
};

const getOrCreateLeadDoc = (record) => {
	return listDocs().then(leadDocs => {

		// Find lead doc if it exists
		let leadDoc = _.find(leadDocs.data, ld => ld.fields.Lead[0] === record.id);

		// If none was found, create a new one
		if (!leadDoc) {
			let newLeadDoc = {
				'Lead': [ record.id ],
			};
			return addLeadDoc(newLeadDoc)
				.then(l => {
					return {
						lead: record,
						leadDoc: l,
					}
				});
		}

		// Otherwise, return what was found
		return {
			lead: record,
			leadDoc,
		};
	});
};

const uploadAttachment = (leadDoc, filePath, fileName) => {
	return base('2. Docs').update([
		{
			id: leadDoc.id,
			fields: {
				'Official ID': [
					{
						url: filePath,
						filename: fileName,
					}
				]
			},
		}
	], (err, records) => {
		// console.log(records);
		return records;
	});
};

module.exports = {
	insertUnique,
	listLeads,
	listDocs,
	listInfo,
	addPopuliLink,
	getTerms,
	getLeadByEmail,
	getCurrentTerm,
	getOrCreateLeadDoc,
	uploadAttachment,
};
