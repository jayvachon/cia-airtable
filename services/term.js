const monday = require('./monday');
const populi = require('./populi');
const appRoot = require('app-root-path');
const fs = require('fs');
const _ = require('lodash');

const currentTermFile = `${appRoot}/currentTerm.json`;

const refreshCurrentTerm = () => {
	return monday.getCurrentTerm()
		.then(currentTerm => {

			const file = fs.readFileSync(currentTermFile);
			let cachedTerm = JSON.parse(file);

			if (cachedTerm.mondayId === currentTerm.mondayId) {

				// early out if the cached term matches the term marked as "current" in Monday
				return Promise.resolve(cachedTerm);
				
			} else {

				// Get the term id in populi
				return populi.getAcademicTermByName(currentTerm.name)
					.then(academicTerm => {

						// Attempts to add the Populi term, but continues with a warning if it can't find it

						if (!academicTerm) {
							console.warn(`No term exists in Populi called ${currentTerm.name}`);
							return populi.getTags();
						}
						currentTerm.populiId = academicTerm.id;
						return populi.getTags();
					})

					.then(allTags => {
						
						// Attempts to add the Populi term tag, but continues with a warning if it can't find it

						const tagName = currentTerm.startDate.substring(0, 7);
						const termTag = _.find(allTags, tag => tag.name === tagName)

						if (!termTag) {
							console.warn(`No tag exists in Populi called ${tagName}`);
						} else {
							currentTerm.tagId = termTag.id;
						}
						return currentTerm;
					})

					// write the new data to the cache
					.then(() => {
						fs.writeFileSync(currentTermFile, JSON.stringify(currentTerm));
						return currentTerm;
					});
			}
		});
};

const getCurrentTerm = () => {
	return JSON.parse(fs.readFileSync(currentTermFile));
};

module.exports = {
	refreshCurrentTerm,
	getCurrentTerm,
};