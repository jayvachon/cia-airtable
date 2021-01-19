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
	drive.init(oAuth2Client);

	// left off here
	// next steps:
	// create picker to rename files and send to airtable
	// attach to drive save

	// Get the 20 most recent emails and filter out the ones that don't have attachments
	gmailer.list20().then(bodies => gmailer.downloadAttachments(bodies))
		.then(bodies => {
			let previews = _.map(bodies[0], body => {
				let sender = _.find(body.data.payload.headers, header => header.name === 'From');
				from = sender.value;
				if (from.includes('<')) {
					from = from.match(/\<(.*?)\>/)[1];
				}

				// Get the filename
				let files = _.map(body.files, file => file.localPath.split(/(\\|\/)/g).pop());

				return {
					from,
					files,
				};
			});
			return res.render('processAttachments', { previews });
		});


	// Find the lead in airtable
	/*airtable.getLeadByEmail('zaimulaaa311@gmail.com')
		.then(lead => {

			// Fetch the student's folder, creating it if it doesn't exist
			let studentName = `${lead.fields['Last Name']}${lead.fields['First Name']}`;
			return drive.getOrCreateParentFolder()
				.then(id => drive.getOrCreateStudentFolder(id, studentName));
		});*/
});

app.post('/process-attachments', (req, res) => {
	// req.body.selectpicker
	// req.body.file
	// req.body.from
	console.log(req.body.selectpicker);
	console.log(JSON.stringify(req.body));
	// console.log(JSON.parse(req.body));
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
