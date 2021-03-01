const dotenv = require('dotenv');
const cron = require('node-cron');
const constants = require('./constants');
const config = require('./config');
const gmailer = require('./gmailer');
const drive = require('./services/drive');
const airtable = require('./airtable');
const populi = require('./services/populi');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const bodyParser = require('body-parser');
const app = express();
const {google} = require('googleapis');
const appRoot = require('app-root-path');
const logger = require(`${appRoot}/config/winston`);
const TOKEN_PATH = 'token.json';
const PORT = process.env.PORT;

dotenv.config({path: __dirname + '/.env'})

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');

const sessionOptions = {
	cookie: { maxAge: 86400000 },
	store: new MemoryStore({
		checkPeriod: 86400000 // prune expired entries every 24h
	}),
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: true,
	cookie: {},
};

app.use(session(sessionOptions));

// 1. Create client
let oAuth2Client = new google.auth.OAuth2(
	config.GOOGLE_CLIENT_ID,
	config.GOOGLE_CLIENT_SECRET,
	config.REDIRECT_URI);

oAuth2Client.on('tokens', (tokens) => {
	console.log(tokens);
});

const isLoggedIn = () => {
	return Object.keys(oAuth2Client.credentials).length !== 0;
};

const autoEmail = (res) => {
	if (isLoggedIn() === false) {
		logger.info('[AUTO-EMAILER] Cannot auto-email because the user is not logged in');
	}

	gmailer.init(oAuth2Client);
	gmailer.list()
		.then(leads => airtable.insertUnique(leads))
		.then(newLeads => {

			// Send emails
			gmailer.send(newLeads.initial);
			gmailer.sendRepeat(newLeads.repeat);

			// Check if any emails have been sent
			let hasLeads = false;
			if (newLeads.initial.length > 0) { hasLeads = true; }
			if (newLeads.repeat.length > 0) { hasLeads = true; }

			if (hasLeads) {
				logger.info(`[AUTO-EMAILER] Added the following leads: ${JSON.stringify(newLeads, null, 4)}`);
			} else {
				logger.info('[AUTO-EMAILER] No new leads were found.');
			}

			// Give feedback
			if (res) {
				res.render('newLeads', { hasLeads, newLeads: newLeads });
			}

			// Mark the emails as read
			return gmailer.markRead(_.map(newLeads.initial, newLead => newLead.id))
				.then(() => {
					return gmailer.markRead(_.map(newLeads.repeat, newLead => newLead.id))
				});
		});
};

app.get('/login', (req, res) => {

	// 2. Generate authorize url
	authorizeUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		prompt: 'consent',
		scope: [
			'https://www.googleapis.com/auth/spreadsheets',
			'https://www.googleapis.com/auth/gmail.readonly',
			'https://www.googleapis.com/auth/gmail.send',
			'https://www.googleapis.com/auth/gmail.modify',

			// 'https://www.googleapis.com/auth/drive.appdata',
			// 'https://www.googleapis.com/auth/drive.file',
			'https://www.googleapis.com/auth/drive',
		].join(' '),
	});

	res.redirect(authorizeUrl);
});

app.get('/auth/google/callback', (req, res) => {

	// 3. Save code
	const code = req.query.code;
	oAuth2Client.getToken(code).then(response => {
		fs.writeFile(TOKEN_PATH, JSON.stringify(response.tokens), (err) => {
			console.log('Token stored to', TOKEN_PATH);
		});

		oAuth2Client.setCredentials(response.tokens);
		res.redirect('/');
	})
	.catch(err => console.error(err));
});

app.get('/populi-login', (req, res) => {
	
	let file = fs.readFileSync('./package.json');
	let pack = JSON.parse(file);
	let environment = process.env.NODE_ENV;
	let root = constants[process.env.NODE_ENV].ROOT;
	
	res.render('populiLogin', { pack, environment, root });
});

app.post('/populi-login', (req, res, next) => {
	populi.getAccessToken(req.body.username, req.body.password)
		.then(token => {
			logger.info('Login succeeded for user ' + req.body.username);
			if (!token) {
				return res.render('login', {error: 'The username and password you provided did not work'});
			}
			req.session.token = token;
			console.log(token);
			res.redirect('/');
		})
		.catch(err => {
			logger.error('Login failed for user ' + req.body.username);
			res.render('login', {error:err});
		});
});

app.get('/', (req, res) => {

	let file = fs.readFileSync('./package.json');
	let pack = JSON.parse(file);
	let environment = process.env.NODE_ENV;
	let root = constants[process.env.NODE_ENV].ROOT;

	let tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
	oAuth2Client.setCredentials(tokens);

	res.render('index', { loggedIn: isLoggedIn(), environment, root });
});

app.get('/email-new-leads', (req, res) => {

	if (isLoggedIn() === false) {
		return res.redirect('/');
	}

	return autoEmail(res);
});

app.get('/log-correspondence', (req, res) => {
	if (isLoggedIn() === false) {
		return res.redirect('/');
	}
	res.render('logCorrespondence');
});

app.get('/manually-add-lead', (req, res) => {
	if (isLoggedIn() === false) {
		return res.redirect('/');
	}
	res.render('manuallyAddLead');
});

app.get('/process-attachments', (req, res) => {
	if (isLoggedIn() === false) {
		return res.redirect('/');
	}
	gmailer.init(oAuth2Client);

	// Get the 20 most recent emails and filter out the ones that don't have attachments
	gmailer.list20().then(bodies => gmailer.downloadAttachments(bodies))
		.then(bodies => {

			// bodies is an array of arrays with only one first element, so flatten the array
			let flatBodies = _.map(bodies, body => body[0]);

			// Group emails by the sender's email address
			let emailsBySender = _.groupBy(flatBodies, body => {
				let sender = _.find(body.data.payload.headers, header => header.name === 'From');
				from = sender.value;
				if (from.includes('<')) {
					from = from.match(/\<(.*?)\>/)[1];
				}
				return from;
			});

			// Put the senders back into an array for easier mapping
			emailsBySender = _.values(_.mapKeys(emailsBySender, (val, key) => {
				val.emails = _.clone(val);
				val.id = key;
				return key;
			}));

			// Create previews with the sender's email address and attachments
			let previews = _.map(emailsBySender, e => {
				
				let files = _.map(e.emails, email => 
					_.map(email.files, file => file.localPath.split(/(\\|\/)/g).pop()));
				files = _.flatten(files);

				return {
					from: e.id,
					files,
				};
			});

			console.log(JSON.stringify(previews, null, 4));

			return res.render('processAttachments', { previews });
		});
});

function uploadAttachment(attachment) {
	if (attachment.type === '') { return Promise.resolve(attachment); }
	else {

		// Get lead and leaddoc records from airtable
		return airtable.getLeadByEmail(attachment.from)
			.then(lead => {
				if (!lead) {
					console.log('No lead record exists for ' + attachment.from);
					return;
				} else {
					return airtable.getOrCreateLeadDoc(lead);
				}
			})

			// Get or create student directory in Drive 
			.then(records => {
				let studentName = `${records.lead.fields['Last Name']}${records.lead.fields['First Name']}`;
				let filePath = `${appRoot}/public/${attachment.file}`;

				let urlPath = '';
				if (process.env.NODE_ENV === 'development') {
					urlPath = 'localhost:8080/';
				} else if (process.env.NODE_ENV === 'production') {
					urlPath = 'https://codeimmersivesadmissions.website/';
				}
				urlPath += attachment.file;

				let fileName = `${records.lead.fields['Last Name']}${records.lead.fields['First Name']}_${attachment.type}${path.extname(filePath)}`;

				return drive.getOrCreateParentFolder()
					.then(id => drive.getOrCreateStudentFolder(id, studentName))
					.then(directory => drive.uploadFile(directory, filePath, fileName))
					.then(fileId => airtable.uploadAttachment(records.leadDoc, urlPath, fileName, attachment.type));
					// Next step: rename files and upload to drive
			});
	}
};

app.post('/process-attachments', async (req, res, next) => {
	
	drive.init(oAuth2Client);

	// Organize uploads by who sent it, the file path, and the selected document type
	let attachments = _.zip(req.body.selectpicker, req.body.file, req.body.from);
	attachments = _.map(attachments, attachment => {
		return {
			from: attachment[2].trim(),
			file: attachment[1],
			type: attachment[0],
		};
	});

	for (attachment of attachments) {
		await uploadAttachment(attachment);
	}
	res.redirect('/');
});

app.get('/set-enrollment-term', (req, res) => {
	if (isLoggedIn() === false) {
		return res.redirect('/');
	}
	let currentTerm = JSON.parse(fs.readFileSync('settings.json')).current_term.Name;
	airtable.getTerms()
		.then(terms => {
			res.render('setEnrollmentTerm', { terms, currentTerm });
		});
});

app.post('/set-enrollment-term', (req, res) => {
	let settings = JSON.parse(fs.readFileSync('settings.json'));
	settings.current_term = JSON.parse(req.body.selectpicker);
	fs.writeFileSync('settings.json', JSON.stringify(settings));
	res.redirect('/');
});

cron.schedule('0 */3 * * *', () => {
	autoEmail();
});

app.listen(PORT);
