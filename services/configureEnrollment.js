const airtable = require('../airtable');
const populi = require('./populi');

// TODO: deprecate

const getDropdownData = () => {
	let dropdowns = {};
	return airtable.getTerms()
		.then(terms => {
			dropdowns.terms = terms;
			return populi.getTags_deprecated();
		})
		.then(tags => {
			dropdowns.tags = tags;
			return populi.getAcademicTerms();
		})
		.then(academicTerms => {
			dropdowns.academicTerms = academicTerms;
			return dropdowns;
		});
}

module.exports = {
	getDropdownData,
};