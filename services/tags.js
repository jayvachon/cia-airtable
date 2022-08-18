const populi = require('./populi');
const _ = require('lodash');

const tag = {
	production: {
		python: '448278', //deprecated
		wdi: '448314',
		as:'448313',
		location: '448311',
	},
	development: {
		python: '433046', //deprecated
		wdi: '448302',
		as: '448301',
		location: '448304',
	},
};

// tagname is the descriptive name used inside this app (in tags.js), not the name on populi
const get = (tagName) => {
	return tag[process.env.NODE_ENV][tagName];
}

module.exports = {
	get,
};