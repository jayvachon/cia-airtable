require('dotenv').config({path: __dirname + '/.env'})
const constants = require('./constants');
const config = require('./config');
const gmailer = require('./gmailer');
const leadsManager = require('./airtable');
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

app.get('/login', (req, res) => {

	// 2. Generate authorize url
	authorizeUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: [
			'https://www.googleapis.com/auth/spreadsheets',
			'https://www.googleapis.com/auth/gmail.readonly',
			'https://www.googleapis.com/auth/gmail.send',
			'https://www.googleapis.com/auth/gmail.modify',
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

	// 4. Final step: apply the authorization to gmail
	gmailer.init(oAuth2Client);
	gmailer.list()
	.then(leads => leadsManager.insertUnique(leads))
	.then(newLeads => {

		// Send emails
		gmailer.send(newLeads.initial);
		gmailer.sendRepeat(newLeads.repeat);

		// Check if any emails have been sent
		let hasLeads = false;
		if (newLeads.initial.length > 0) { hasLeads = true; }
		if (newLeads.repeat.length > 0) { hasLeads = true; }

		// Give feedback
		res.render('newLeads', { hasLeads, newLeads: newLeads });

		// Mark the emails as read
		return gmailer.markRead(_.map(newLeads.initial, newLead => newLead.id))
			.then(() => {
				return gmailer.markRead(_.map(newLeads.repeat, newLead => newLead.id))
			});
	});
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
	gmailer.list20().then(messages => {
		// console.log(messages);
	});
});

app.listen(PORT);
