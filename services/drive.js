const _ = require('lodash');
const fs = require('fs');
const {google} = require('googleapis');

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

module.exports = {
	init,
	getOrCreateParentFolder,
};