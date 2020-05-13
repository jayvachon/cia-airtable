const cheerio = require('cheerio');
const _ = require('lodash');

const extract = (html) => {

	const $ = cheerio.load(html);
	const tables = $('.mcnTextContentContainer > tbody > tr > td').children('table');

	// New Entry: New Candidate
	if (tables.length > 0) {

		let form = {};
		_.forEach(tables, table => _.assign(form, readTable(table)));

		// Reformat data
		let name = _.split(form.Name, ' ');
		let firstName = name[0];
		let lastName = name[1];

		let international = form['If You Are an International Student Choose Status'];
		let veteran = form['Will You Be Seeking Veteran Benefits']
		let status = 'unknown';

		if (international !== 'Select One') {
			status = 'International - ' + international;
		}
		if (veteran !== 'Select One' && veteran !== 'No') {
			status = _.replace(veteran, 'Yes,', 'Veteran -')
		}

		return {
			firstName: firstName,
			lastName: lastName,
			email: form.Email,
			phone: form['Cell Phone'],
			program: form['Choose a program'],
			status: status,
			aid: form['Will You Be Applying For Financial Aid'],
			message: '',
		};

		return form;
	}

	// Get In Touch
	const columns = $('.toptxt td');
	if (columns.length > 0) {
		
		let form = readGetInTouchTable($, columns);
		let name = _.split(form.Name, ' ');
		let firstName = name[0];
		let lastName = name[1];
		let status = '';

		if (form['Tell us how you found us!'] === 'VA or Veteran Agency') {
			status = 'Veteran';
		}
		
		return {
			firstName: firstName,
			lastName: lastName,
			email: form['Email Address'] || form['Email'],
			phone: form['Phone Number'],
			program: '',
			status: status,
			aid: '',
			message: form.Message,
		};
	}
	
	return {};
};

const readTable = (table) => {
	
	const $ = cheerio.load(table);
	const content = {};
	
	$('tbody').children('tr').each((i, elem) => {
		let text = $(elem).children().first().text();
		if (i === 0) {
			content.key = text;
		} else if (i === 1) {
			content.value = text;
		}
	});

	return {[content.key]: content.value};
};

const readGetInTouchTable = ($, columns) => {

	let form = {};

	for (let i = 0; i < columns.length; i += 2) {
		let elem1 = _.trimEnd($(columns[i]).children().first().text(), ':');
		let elem2 = $(columns[i+1]).text();
		form[elem1] = elem2;
	}

	return form;
};

module.exports = {
	extract,
	readTable,
	readGetInTouchTable,
};