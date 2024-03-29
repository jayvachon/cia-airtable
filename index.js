const dotenv = require('dotenv');
const cors = require('cors');
const cron = require('node-cron');
const fileUpload = require('express-fileupload');
const constants = require('./constants');
const config = require('./config');
const gmailer = require('./gmailer');
const drive = require('./services/drive');
const airtable = require('./airtable');
const monday = require('./services/monday');
const populi = require('./services/populi');
const studentCreation = require('./services/studentCreation');
const termService = require('./services/term');
const templates = require('./templates');
const multer = require('multer');
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
const router = express.Router();

dotenv.config({path: __dirname + '/.env'})

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/ci', router);
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

// Upload config
const storage = multer.diskStorage({
	destination: '/tmp/uploads',
	filename: function (req, file, cb) {
		cb(null, file.fieldname + '-' + Date.now());
	},
	limits: {
		fieldSize: 50 * 1024 * 1024, // 5 MB
	},
});
const upload = multer({ storage: storage });

const validateExtension = (filename, extension) => {
	return filename.substring(filename.lastIndexOf('.') + 1) === extension;
};

router.use(cors());
router.use(express.json({limit:'1mb'}));
router.use(fileUpload());

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
		.then(leads => monday.insertUniqueLead(leads))
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

app.get('/registrar/login', (req, res) => {

	let environment = process.env.NODE_ENV;
	let root = constants[process.env.NODE_ENV].ROOT;

	res.render('registrarLogin', { environment, root });
});

app.post('/registrar/login', (req, res, next) => {

			let environment = process.env.NODE_ENV;
			let root = constants[process.env.NODE_ENV].ROOT;

	populi.getAccessToken(req.body.username, req.body.password)
		.then(token => {

			logger.info('Login succeeded for user ' + req.body.username);
			if (!token) {
				return res.render('error', {error: 'The username and password you provided did not work', home: '/registrar/login' });
			}
			req.session.registrarToken = token;
			res.redirect('/registrar/transfer-credit-upload');
		})
		.catch(err => {
			logger.error('Login failed for user ' + req.body.username);
			res.render('error', {error:err, home: '/registrar/login'});
		});
});

router.get('/refresh-term', (req, res) => {
	termService.refreshCurrentTerm().then(term => {
		console.log(term);
		res.send(term);
	});
});

app.get('/registrar/transfer-credit-upload', (req, res) => {

	if (!req.session || !req.session.registrarToken) {
		return res.redirect('/registrar/login');
	}

	let environment = process.env.NODE_ENV;
	let root = constants[process.env.NODE_ENV].ROOT;

	res.render('transferCreditUpload', { environment, root });
});

app.post('/registrar/transfer-credit-upload', upload.single('fileupload'), (req, res, next) => {

	if (req.file.size > 5 * 1000000) { // 5 MB
		res.render('error', { error: 'File size is too large. File must be less than 5 MB', home: '/registrar/transfer-credit-upload' });
		return;
	}

	if (validateExtension(req.file.originalname, 'xlsx') === false) {
		res.render('error', { error: `The uploaded file "${req.file.originalname}" could not be processed because it is not type xlsx`, home: '/registrar/transfer-credit-upload'})
		return;
	}

	const file = fs.readFileSync(req.file.path);

	const tc = require('./services/transferCredit');

	// console.log("hI", req.session.registrarToken)

	tc.readXlsx(file.buffer).then(transfers => {
		if (transfers.error) {
			res.render('error', { error: transfers.error, home: '/registrar/transfer-credit-upload' });
		} else {
			Promise.all(_.map(transfers.transfers, transfer => {
				return populi.addTransferCredit(transfer, req.session.registrarToken)
					.then(transferResponse => {
						// console.log(transferResponse)
						// return transferResponse;
						// console.log(transfer)
						return populi.addTransferCreditProgram(transferResponse, transfer['Program ID'], transfer.Grade, req.session.registrarToken);
					})
					.then(transferProgramResponse => {
						console.log(transferProgramResponse);
						return transferProgramResponse;
					})
					.catch(err => {
						return { error: err };
					});
			})).then(response => {
				if (response[0].error) {
					res.render('error', { error: response[0].error, home: '/registrar/transfer-credit-upload' });
				}
				res.render('transferCreditSuccess');
			})
			.catch(err => {
				res.render('error', { error: err, home: '/registrar/transfer-credit-upload' });
			})
		}
	})

});

app.get('/registrar/transfer-credit-template', function(req, res){
  const file = `${appRoot}/public/TransferCreditTemplate.xlsx`;
  res.download(file);
});

router.get('/create-student', (req, res) => {
	console.log(req)
});

router.get('/login', (req, res) => {

	// 2. Generate authorize url
	authorizeUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		prompt: 'consent',
		scope: [
			'https://www.googleapis.com/auth/spreadsheets',
			'https://www.googleapis.com/auth/gmail.readonly',
			'https://www.googleapis.com/auth/gmail.send',
			'https://www.googleapis.com/auth/gmail.modify',
			'https://mail.google.com/',

			// 'https://www.googleapis.com/auth/drive.appdata',
			// 'https://www.googleapis.com/auth/drive.file',
			'https://www.googleapis.com/auth/drive',
		].join(' '),
	});

	res.redirect(authorizeUrl);
});

// might have to update this redirect route in google services
router.get('/auth/google/callback', (req, res) => {

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

router.get('/populi-login', (req, res) => {
	
	let file = fs.readFileSync('./package.json');
	let pack = JSON.parse(file);
	let environment = process.env.NODE_ENV;
	let root = constants[process.env.NODE_ENV].ROOT;
	
	res.render('populiLogin', { pack, environment, root });
});

router.post('/populi-login', (req, res, next) => {
	populi.getAccessToken(req.body.username, req.body.password)
		.then(token => {
			logger.info('Login succeeded for user ' + req.body.username);
			if (!token) {
				return res.render('login', {error: 'The username and password you provided did not work'});
			}
			req.session.token = token;
			res.redirect('/');
		})
		.catch(err => {
			logger.error('Login failed for user ' + req.body.username);
			res.render('login', {error:err});
		});
});

router.get('/developer', (req, res) => {
	monday.getColumns().then(result => {
		res.render('developer', { columns: result.columns });
	});
});

router.get('/', (req, res) => {

	let file = fs.readFileSync('./package.json');
	let pack = JSON.parse(file);
	let environment = process.env.NODE_ENV;
	let root = constants[process.env.NODE_ENV].ROOT;
	let currentTerm = JSON.parse(fs.readFileSync('settings.json')).current_term.Name;

	let tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
	oAuth2Client.setCredentials(tokens);

	res.render('index', { loggedIn: isLoggedIn(), environment, root, currentTerm });
});

router.get('/email-new-leads', (req, res) => {

	if (isLoggedIn() === false) {
		return res.redirect('/');
	}

	return autoEmail(res);
});

router.get('/student-creation-preview', (req, res) => {
	studentCreation.preview_monday().then(results => {
		res.render('studentCreationPreview', { results });
	})
	.catch(err => {
		res.render('error', { error: err, home: '/ci' });
	});
});

router.get('/student-creation', (req, res) => {
	studentCreation.create_monday().then(results => {
		// res.send(results);
		console.log("HERE:")
		console.log(JSON.stringify(results))
		res.render('studentCreationResults', { results });
	})
	.catch(err => {
		res.render('error', { error: err, home: '/ci'})
	});
});

router.get('/send-enrollment-information', (req, res) => {
	if (isLoggedIn() === false) {
		return res.redirect('/');
	}
	gmailer.init(oAuth2Client);
	gmailer.list20(false)
		.then(emails => {
			let simpleEmails = _.map(emails, email => {
				let from = _.find(email.data.payload.headers, header => header.name === 'From').value;
				let subject = _.find(email.data.payload.headers, header => header.name === 'Subject').value;
				return {
					from,
					subject,
					snippet: email.data.snippet,
					id: email.data.id,
				};
			});

			let template = templates.enrollmentInformation('testname');

			res.render('sendEnrollmentInformation', { emails: simpleEmails, template });
		});
});

// req.body for POST
// req.query for GET

router.get('/api/lead', (req, res) => {
	monday.getOrCreateLead(req.query.email).then(lead => {
		console.log(lead)
		res.json(lead);
	});
});

router.post('/api/updateLead', (req, res) => {
	monday.updateLeadValues(req.body.leadId, req.body.columnValues).then(response => {
		if (response.update && response.update.change_multiple_column_values) {
			monday.getLeadById(response.update.change_multiple_column_values.id).then(lead => {
				res.json(lead);
			})
		} else {
			res.json({ error: response.error });
		}
	});
});

router.post('/api/upload', (req, res) => {
	const files = req.files;
	if (!files || Object.keys(files).length === 0) {
		return res.status(400).send('No files were uploaded.');
	}
	const file = files.file;
	// console.log(file)
	const uploadPath = `${appRoot}/uploads/${file.name}`;
	file.mv(uploadPath, err => {
		if (err) {
			console.log(err);
			return res.status(500).send(err);
		}
		monday.uploadLeadDocument(req.body.leadId, req.body.documentType, uploadPath)
			.then(err => {
				if (err) {
					console.log(err);
				}
				// res.end();
				monday.getLeadById(req.body.leadId).then(lead => {
					res.json(lead);
				})
			});
	})
});

router.get('/logs', (req, res) => {
	let combined = fs.readFileSync(`${appRoot}/logs/combined.log`, 'utf-8');
	let error = fs.readFileSync(`${appRoot}/logs/error.log`, 'utf-8');
	
	let combineds = combined.split('\n')
		.filter(e => String(e).trim())
		.map(JSON.parse)
		.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
	
	let errors = error.split('\n')
		.filter(e => String(e).trim())
		.map(JSON.parse)
		.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
	
	
	res.render('logs', { combineds, errors });
});

cron.schedule('0 */1 * * *', () => {
	if (process.env.CRON === 'on') {
		autoEmail();
	}
});

app.listen(PORT);
