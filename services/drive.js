const _ = require('lodash');
const fs = require('fs');
const {google} = require('googleapis');
const mime = require('mime-types');

let drive = {};
const init = (auth) => {
	drive = google.drive({ version: 'v3', auth });
};

const getCurrentTerm = () => {
	let currentTerm = JSON.parse(fs.readFileSync('settings.json')).current_term;
	return currentTerm.Name;
};

const getOrCreateParentFolder = () => {

	let currentTerm = getCurrentTerm();
	let studentFilesDir = '12_-dOC0vFHifZIU08uqXb671EySMeCM8'; // the root "_Student files" directory

	// List the term directories
	return drive.files.list({
		corpora: 'user',
		q: `"${studentFilesDir}" in parents`,
	}).then(list => {

		// See if we can find the current term
		let currentTermDir = _.find(list.data.files, dir => {
			return dir.name === currentTerm;
		});

		// If not, create a new folder for the current term
		if (!currentTermDir) {

			let fileMetadata = {
				'name': currentTerm,
				'parents': [studentFilesDir],
				'mimeType': 'application/vnd.google-apps.folder',
			};

			return drive.files.create({
				resource: fileMetadata,
				fields: 'id',
			})
			.then(result => {
				return result.data.id;
			});
		} else {
			return currentTermDir.id;
		}
	})
	.catch(err => console.error(err));
};

const getOrCreateStudentFolder = (parentFolder, studentName) => {

	// student name should be formatted LastnameFirstname

	return drive.files.list({
		corpora: 'user',
		q: `"${parentFolder}" in parents`,
	}).then(list => {

		// See if we can find the student
		let studentDir = _.find(list.data.files, dir => {
			return dir.name === studentName;
		});

		// If not, create a new folder for the student
		if (!studentDir) {

			let fileMetadata = {
				'name': studentName,
				'parents': [parentFolder],
				'mimeType': 'application/vnd.google-apps.folder',
			};

			return drive.files.create({
				resource: fileMetadata,
				fields: 'id',
			})
			.then(result => {
				return result.data.id;
			});

		} else {
			return studentDir.id;
		}
	})
	.catch(err => console.error(err));
};

const uploadFile = (directory, filePath, fileName) => {

	let fileMetadata = {
		'name': fileName,
		'parents': [directory],
	};

	var media = {
		mimeType: mime.lookup(filePath),
		body: fs.createReadStream(filePath),
	};

	return drive.files.create({
		resource: fileMetadata,
		media: media,
		fields: 'id'
	}, (err, file) => {
		if (err) {
			// Handle error
			console.error(err);
		} else {
			return file.data.id;
		}
	});
};

const downloadAttachment = (data) => {
	const fileContents = new Buffer(data, 'base64');
	// fs.writeFile()
};

module.exports = {
	init,
	getOrCreateParentFolder,
	getOrCreateStudentFolder,
	uploadFile,
};