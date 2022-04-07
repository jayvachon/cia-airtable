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
const configureEnrollment = require('./services/configureEnrollment');
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

router.use(session(sessionOptions));

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
		// .then(leads => airtable.insertUnique(leads))
		.then(leads => monday.insertUnique(leads))
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

app.get('/registrar/transfer-credit-upload', (req, res) => {

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

	// console.log(req.file)
	const tc = require('./services/transferCredit');
	const transfers = tc.readXlsx(file.buffer);

	const errors = _.filter(transfers, transfer => transfer.error);
	if (errors.length > 0) {
		res.render('error', { error: errors[0].error, home: '/registrar/transfer-credit-upload' });
	} else {
		Promise.all(_.map(transfers, transfer => {
			populi.addTransferCredit(transfer);
		})).then(response => {
			// console.log(response);
			// res.redirect('/registrar/transfer-credit-upload')
			res.render('transferCreditSuccess');
		});
	}
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

router.get('/log-correspondence', (req, res) => {
	if (isLoggedIn() === false) {
		return res.redirect('/');
	}
	res.render('logCorrespondence');
});

router.get('/manually-add-lead', (req, res) => {
	if (isLoggedIn() === false) {
		return res.redirect('/');
	}
	res.render('manuallyAddLead');
});

router.get('/process-attachments', (req, res) => {
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
					// console.log('No lead record exists for ' + attachment.from);
					throw new Error('No lead record exists for ' + attachment.from);
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

router.post('/process-attachments', async (req, res, next) => {
	
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


	try {
		for (attachment of attachments) {
			await uploadAttachment(attachment);
		}
		res.redirect('/');
	}
	catch (e) {
		res.render('error', { error: e });
	}
});

router.get('/set-enrollment-term', (req, res) => {
	if (isLoggedIn() === false) {
		return res.redirect('/');
	}
	let settings = JSON.parse(fs.readFileSync('settings.json'));
	let currentTerm = settings.current_term.Name;
	let currentCertificateTag = settings.current_certificate_tag.name;
	let currentAssociatesTag = settings.current_associates_tag.name;
	let currentAcademicTerm = settings.current_academic_term.name;

	configureEnrollment.getDropdownData()
		.then(dropdowns => {
			res.render('setEnrollmentTerm', { 
				currentTerm,
				currentCertificateTag,
				currentAssociatesTag,
				currentAcademicTerm,
				terms: dropdowns.terms,
				tags: dropdowns.tags,
				academicTerms:dropdowns.academicTerms 
			});
		})
});

router.post('/set-enrollment-term', (req, res) => {
	let settings = JSON.parse(fs.readFileSync('settings.json'));
	let body = req.body;
	if (body.selectpicker_term !== '') {
		settings.current_term = JSON.parse(req.body.selectpicker_term);
	}
	if (body.selectpicker_tags_certificate !== '') {
		settings.current_certificate_tag = JSON.parse(body.selectpicker_tags_certificate);
	}
	if (body.selectpicker_tags_associates !== '') {
		settings.current_associates_tag = JSON.parse(body.selectpicker_tags_associates);
	}
	if (body.selectpicker_academicTerm !== '') {
		settings.current_academic_term = JSON.parse(body.selectpicker_academicTerm);
	}
	fs.writeFileSync('settings.json', JSON.stringify(settings));
	res.redirect('/ci');
});

router.get('/student-creation-preview', (req, res) => {
	studentCreation.preview().then(results => {
		res.render('studentCreationPreview', { results });
	})
	.catch(err => {
		res.render('error', { error: err });
	});
});

router.get('/student-creation', (req, res) => {
	studentCreation.create2().then(results => {
		// res.send(results);
		console.log(JSON.stringify(results))
		res.render('studentCreationResults', { results });
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
		res.json(lead);
	});
});

router.post('/api/updateLead', (req, res) => {
	console.log(req.body)
	monday.updateLeadValues(req.body.leadId, req.body.columnValues).then(update => {
		if (update && update.change_multiple_column_values) {
			monday.getLeadById(update.change_multiple_column_values.id).then(lead => {
				res.json(lead);
			})
		} else {
			res.json({ error: true });
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
	let combined = fs.readFileSync(`${appRoot}/logs/combined.log`);
	let error = fs.readFileSync(`${appRoot}/logs/error.log`);
	res.render('logs', { combined, error });
});

cron.schedule('0 */1 * * *', () => {
	autoEmail();
});

app.listen(PORT);
