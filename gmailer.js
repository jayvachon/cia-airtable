const parser = require('./parser');
const _ = require('lodash');
const {google} = require('googleapis');

let gmail = {};

const init = (auth) => {
	gmail = google.gmail({version: 'v1', auth: auth});
};

const base64ToString = (base64str) => {
	if (!base64str) return '';
	const buff = Buffer.from(base64str, 'base64');
	return buff.toString('utf8');
};

const getMessages = (ids) => {
	return Promise.all(_.map(ids, id => {
		return gmail.users.messages.get({
			id: id,
			userId: 'me',
			format: 'full',
		});
	}))
};

const extractBody = (messages) => {
	return new Promise((resolve, reject) => {
		return resolve(
			_.map(messages, message => {

				if (message.data.payload.parts) {
					let parts = message.data.payload.parts;
					return {
						id: message.data.id,
						content: _.map(parts, part => {
							return base64ToString(part.body.data);
						}),
					}
				} else {
					return { 
						id: message.data.id,
						content: [base64ToString(message.data.payload.body.data)],
					};
				}
			})
		)
	});
};

const list = () => {
	return gmail.users.messages.list({
		userId: 'me',
		q: 'in:all subject:"Get in touch" OR subject:"New Entry: New Candidate" OR subject:"Contact Us Form"'
	})
	.then(list => {
		return _.map(list.data.messages, m => m.id);
	})
	.then(ids => getMessages(ids))
	.then(messages => extractBody(messages))
	.then(bodies => {
		
		// Find new entries and pull out the important data
		let entries = _.map(bodies, body => {
			return {
				id: body.id,
				content: parser.extract(body.content[0]),
			};
		});

		return _.filter(entries, entry => entry.content.email !== undefined);
	})
	.catch(err => console.error(err));
};

module.exports = {
	init,
	list,
};