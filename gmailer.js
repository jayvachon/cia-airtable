const parser = require('./parser');
const templates = require('./templates');
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

const stringToBase64 = (str) => {
	const buff = Buffer.from(str, 'utf8');
	return buff.toString('base64');
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
		// console.log(JSON.stringify(messages[4], null, 4));
		return resolve(
			_.chain(messages)

				// Remove the messages that have already been processed (marked by a star)
				.filter(message => {
					return !_.includes(message.data.labelIds, "STARRED");
				})
				.map(message => {
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
				.value()
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

const makeBody = (to, from, subject, message) => {
    let str = ["Content-Type: text/html; charset=\"UTF-8\"\n",
        "MIME-Version: 1.0\n",
        "Content-Transfer-Encoding: 7bit\n",
        "to: ", to, "\n",
        "from: ", from, "\n",
        "subject: ", subject, "\n\n",
        message
    ].join('');

    return stringToBase64(str).replace(/\+/g, '-').replace(/\//g, '_');;
};

const sendMessage = (raw) => {
    return gmail.users.messages.send({
        userId: 'me',
        resource: {
            raw: raw
        }
    });
};

const send = (newLeads) => {
	return Promise.all(_.each(newLeads, lead => {
			let body = templates.initial(lead.content.firstName, lead.content.program, 'January 2021');
			let raw = makeBody(lead.content.email, 'admissions@codeimmersives.com', 'RE: Code Immersives', body)
			return sendMessage(raw);
		})
	);
};

const sendRepeat = (repeatLeads) => {
	return Promise.all(_.each(repeatLeads, lead => {
		let body = templates.repeat(lead.content.firstName, lead.content.program, 'January 2021');
		let raw = makeBody(lead.content.email, 'admissions@codeimmersives.com', 'Would you like to enroll at Code Immersives?', body)
		return sendMessage(raw);
	}));
};

const markRead = (ids) => {
	return Promise.all(_.map(ids, id => {
		return gmail.users.messages.modify({
			id: id,
			userId: 'me',
			addLabelIds: ['STARRED'],
			removeLabelIds: ['UNREAD'],
		});
	}));
};

module.exports = {
	init,
	list,
	send,
	sendRepeat,
	markRead,
};