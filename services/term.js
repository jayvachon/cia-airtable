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

					// get the tag ids from populi
					.then(allTags => {

						const tags = _.pickBy(currentTerm, function(v, k) {
							return _.includes(k, 'Tag');
						});

						_.forEach(tags, (v, k) => {
							let tag = _.find(allTags, allTag => allTag.name === v);
							if (!tag) {
								// this doesn't work and i can't be bothered to figure out why
								return Promise.reject(new Error(`No tag with the name ${v} could be found in Populi`))
							} else {
								currentTerm[`${k}Id`] = tag.id;
							}
						});

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