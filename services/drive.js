const {google} = require('googleapis');

let drive = {};
const init = (auth) => {
	drive = google.drive({ version: 'v3', auth });
};

const getOrCreateFolder = () => {
	// parent: '1Gr_84wTEvsQ7mLJrZcaEdk1uNVUwmnkp'
	let fileMetadata = {
		'name': 'Invoices',
		'parents': ['1Gr_84wTEvsQ7mLJrZcaEdk1uNVUwmnkp'],
		'mimeType': 'application/vnd.google-apps.folder',
	};
	// drive();

	// Left off here: the folder can be created
	// next, check if folder exists and create it if it doesn't
	drive.files.create({
		resource: fileMetadata,
		fields: 'id',
	});
};

module.exports = {
	init,
	getOrCreateFolder,
};