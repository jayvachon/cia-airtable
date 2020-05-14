const config = require('./config');
const gmailer = require('./gmailer');
const leadsManager = require('./leadsManager');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const express = require('express');
const app = express();
const {google} = require('googleapis');
const TOKEN_PATH = 'token.json';

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

// 1. Create client
let oAuth2Client = new google.auth.OAuth2(
	config.GOOGLE_CLIENT_ID,
	config.GOOGLE_CLIENT_SECRET,
	config.REDIRECT_URI);

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
			'https://www.googleapis.com/auth/gmail.send'
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

app.get('/', (req, res) => {
	res.render('index', { loggedIn: isLoggedIn() });
});

app.get('/email-new-leads', (req, res) => {

	if (isLoggedIn() === false) {
		return res.redirect('/');
	}

	// 4. Final step: apply the authorization to gmail
	gmailer.init(oAuth2Client);
	gmailer.list().then(leads => leadsManager.insertUnique(leads))
	.then(newLeads => {
		gmailer.send(newLeads);
		res.render('newLeads', { hasLeads: newLeads.length > 0, newLeads: newLeads });
	});
});

app.listen('8080');
