const airtable = require('../airtable');
const populi = require('./populi');

const getDropdownData = () => {
	let dropdowns = {};
	return airtable.getTerms()
		.then(terms => {
			dropdowns.terms = terms;
			return populi.getTags();
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