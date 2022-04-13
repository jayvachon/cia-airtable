const appRoot = require('app-root-path');
const fs = require('fs');
const xlsx = require('xlsx');
const _ = require('lodash');
const logger = require(`${appRoot}/config/winston`);
const populi = require('./populi');

const readXlsx = (file) => {

	const read = xlsx.read(file, { type: 'buffer' });
	const sheet = read.Sheets[Object.keys(read.Sheets)[0]];
	const range = xlsx.utils.decode_range(sheet['!ref']);

	let result = [];
	let row;
	let rowNum;
	let colNum;
	for (rowNum = range.s.r; rowNum <= range.e.r; rowNum++){
		row = [];
		for (colNum = range.s.c; colNum <= range.e.c; colNum++){
			let nextCell = sheet[
				xlsx.utils.encode_cell({r: rowNum, c: colNum})
			];
			if (typeof nextCell === 'undefined'){
				row.push(void 0);
			} else row.push(nextCell.w);
		}
		result.push(row);
	}
	
	let headers = result.shift(); // the first row is headers
	headers = _.filter(headers, header => header !== undefined); // remove any columns that come in as "undefined"

	if (validateHeaders(headers) === false) {
		return [ { error: 'Wrong headers' }];
	}

	_.remove(result, r => { return _.uniq(r).length < 2; }) // remove empty rows
	let transfers = _.map(result, r => { return _.zipObject(headers, r); });
	transfers = _.map(transfers, transfer => validate(transfer));

	return Promise.all(_.map(transfers, transfer => populi.getPerson(transfer['Person ID']))) // make sure all people exist
		.then(() => Promise.all(_.map(transfers, transfer => populi.getOrganization(transfer['Organization ID'])))) // make sure all oganizations exist
		.then(() => Promise.all(_.map(transfers, transfer => populi.getCatalogCourse(transfer['Catalog Course ID'])))) // make sure all the course catalogs exist
		.then(res => {
			return { transfers };
		})
		.catch(err => {
			return { error: err }
		});
};

const validateHeaders = (headers) => {
	return _.isEqual(headers, [
		'Organization ID',
		'Person ID',
		'Course Number',
		'Course Name',
		'Credits',
		'Catalog Course ID',
		'Effective Date'
	]);
}

const validate = (transfer) => {
	if (_.some(transfer, _.isEmpty)) {
		return { error: 'row is missing one or more values' }
	} else {
		return transfer;
	}
};

module.exports = {
	readXlsx,
};