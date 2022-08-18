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
						if (!academicTerm) {
							return Promise.reject(new Error(`No term exists in Populi called ${currentTerm.name}`))
						}
						currentTerm.populiId = academicTerm.id;
						return populi.getTags();
					})

					.then(allTags => {

						// This will throw an error if the term tag has not been created yet
						currentTerm.tagId = _.find(allTags, tag => tag.name === currentTerm.startDate.substring(0, 7)).id;

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