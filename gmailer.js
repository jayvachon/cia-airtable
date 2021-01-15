const parser = require('./parser');
const templates = require('./templates');
const _ = require('lodash');
const fs = require('fs');
const appRoot = require('app-root-path');
const {google} = require('googleapis');

const getCurrentTerm = () => {
	let currentTerm = JSON.parse(fs.readFileSync('settings.json')).current_term;
	let startDate = new Date(currentTerm['Start date']);
	let month = startDate.toLocaleString('default', { month: 'long' });
	let year = startDate.getFullYear();
	return `${month} ${year}`;
};

let gmail = {};

const init = (auth) => {
	gmail = google.gmail({version: 'v1', auth: auth});
	return google;
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

// Returns a list of "Get In Touch" emails
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

// Returns the 20 most recent emails
const list20 = () => {
	return gmail.users.messages.list({
		userId: 'me',
		maxResults: 20,
		includeSpamTrash: false,
		q: 'in:inbox -category:{social promotions updates forums}',
	})
	.then(list => {
		return _.map(list.data.messages, m => m.id);
	})
	.then(ids => getMessages(ids))
	.then(bodies => {
		return _.chain(bodies)
			.filter(body => {
				
				let sender = _.find(body.data.payload.headers, header => header.name === 'From');
				if (!sender) return false; // the sender must be known
				let from = sender.value;

				let excludeEmails = [
					'admissions@codeimmersives.com',
					'colleen.komar@digitalfilmacademy.edu',
					'anthony.derosa@codeimmersives.com',
				];

				if (from.includes('<')) {
					from = from.match(/\<(.*?)\>/)[1];
				}

				if (_.some(excludeEmails, _.method('includes', from))) {
					return false; // the sender cannot be one of the excluded email addresses
				}
				
				let parts = body.data.payload.parts;
				let attachments = _.find(parts, part => part.filename !== '');
				if (!attachments) return false; // the email must have attachments

				return true;
			})
			.value();
	})
	.catch(err => console.error(err));
};

const downloadAttachments = (emailBodies) => {
	return Promise.all(_.map(emailBodies, body => {

		// downloaded files will be attached to the email body
		body.files = [];
		let messageId = body.data.id;

		// filter out emails that don't have attachments
		let attachments = _.filter(body.data.payload.parts, part => part.filename !== '');
		console.log(`Downloading ${JSON.stringify(_.map(attachments, attachment => attachment.filename))}`);

		return Promise.all(_.map(attachments, attachment => {

			// capture the file information
			let filename = attachment.filename;
			let mimeType = attachment.mimeType;

			// download the file and save it locally
			return gmail.users.messages.attachments.get({
				id: attachment.body.attachmentId,
				messageId,
				userId: 'me',
			}).then(file => {

				// save the file
				const fileContents = Buffer.from(file.data.data, 'base64');
				return new Promise((resolve, reject) => {
					fs.writeFile(`${appRoot}/uploads/${filename}`, fileContents, (err) => {
						if (err) reject(err);
						else {

							// add the file information to the email body along with its local path
							file.localPath = `${appRoot}/uploads/${filename}`;
							body.files.push(file);
							resolve(body);
						}
					})
				});
			});
		}));
	}));
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
	let currentTerm = getCurrentTerm();
	return Promise.all(_.each(newLeads, lead => {
			let body = templates.initial(lead.content.firstName, lead.content.program, currentTerm);
			let raw = makeBody(lead.content.email, 'admissions@codeimmersives.com', 'RE: Code Immersives', body)
			return sendMessage(raw);
		})
	);
};

const sendRepeat = (repeatLeads) => {
	let currentTerm = getCurrentTerm();
	return Promise.all(_.each(repeatLeads, lead => {
		let body = templates.repeat(lead.content.firstName, lead.content.program, currentTerm);
		let raw = makeBody(lead.content.email, 'admissions@codeimmersives.com', 'Would you like to enroll at Code Immersives?', body)
		return sendMessage(raw);
	}));
};

const markRead = (ids) => {
	return Promise.all(_.map(ids, id => {
		return gmail.users.messages.modify({
			id: id,
			userId: 'me',
			addLabelIds: ['STARRED', 'INBOX'],
			removeLabelIds: ['UNREAD', 'SPAM'],
		});
	}));
};

module.exports = {
	init,
	list,
	list20,
	send,
	sendRepeat,
	markRead,
	downloadAttachments,
};