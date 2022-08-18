const dotenv = require('dotenv');
const airtable = require('../airtable');
const populi = require('./populi');
const monday = require('./monday');
const termService = require('./term');
const tagService = require('./tags');
const _ = require('lodash');
const constants = require('../constants');
const appRoot = require('app-root-path');
const logger = require(`${appRoot}/config/winston`);
const fs = require('fs');

const leadInfo = {
	production: {
		admissions_officer_id: '23356676',
		program_id: {
			python: '35666',
			wdi: '35366',
			as: '35348',
		},
		term_id: '283058',
		ed_level: {
			high_school: '3',
			some_college: '4',
			associates: '5',
			bachelors: '6',
			masters: '7',
			doctoral: '8',
		},
	},
	development: {
		admissions_officer_id: '23356676',
		program_id: {
			python: '35666',
			wdi: '35366',
			as: 'XXXX',
		},
		term_id: '283070',
		ed_level: {
			high_school: '3',
			some_college: '4',
			associates: '5',
			bachelors: '6',
			masters: '7',
			doctoral: '8',
		},
	},
};

// call this instead of accessing the above leadInfo object directly so that the term ID is up to date
const getLeadInfo = () => {
	let li = leadInfo[process.env.NODE_ENV];
	li.term_id = termService.getCurrentTerm().populiId;
	return li;
};

const application = {
	production: {
		application_template_id: '34334',
		email_link_to_applicant: 'true',
	},
	development: {
		application_template_id: '34334',
		email_link_to_applicant: 'false',
	},
};

const findNewStudents = (info) => {
	return _.filter(info, student => {
		if (student.fields.Populi !== undefined) {
			return false;
		}
		return true;
	});
};

const mapEducationLevel = (educationLevel) => {
	switch(educationLevel) {
		case 'High School Diploma': return leadInfo[process.env.NODE_ENV].ed_level.high_school;
		case 'Some College': return leadInfo[process.env.NODE_ENV].ed_level.some_college;
		case 'Associate\'s Degree': return leadInfo[process.env.NODE_ENV].ed_level.associates;
		case 'Bachelor\'s Degree': return leadInfo[process.env.NODE_ENV].ed_level.bachelors;
		case 'Master\'s Degree': return leadInfo[process.env.NODE_ENV].ed_level.masters;
		case 'Doctoral Degree': return leadInfo[process.env.NODE_ENV].ed_level.doctoral;
		default: return leadInfo[process.env.NODE_ENV].ed_level.high_school;
	}
};

const preview_monday = () => {
	
	let obj = {}

	return termService.refreshCurrentTerm()
		.then(currentTerm => {
			obj.term = currentTerm;
			return monday.getStudentsForPopuliCreation();	
		})
		.then(students => {

			leadInfo.term_id = obj.term.populiId;

			return _.map(students, newStudent => {

				let program = newStudent.course;
				let programShort = '';

				if (program === 'Associate of Science in Computer Science and Web Architecture') {
					// tag = obj.term.waTagId;
					// tagName = obj.term.waTag;
					programShort = 'as';
				}
				else if (program === 'Web Development Immersive Certificate') {
					// tag = obj.term.wdiTagId;
					// tagName = obj.term.wdiTag;
					programShort = 'wdi';
				}

				let profile = {
					mondayId: newStudent.mondayId,
					'First Name': newStudent.firstName,
					'Last Name': newStudent.lastName,
					'Birth Date': newStudent.dateOfBirth,
					'Phone Number': newStudent.phone,
					'Social Security Number': newStudent.socialSecurityNumber,
					street: newStudent.street,
					city: newStudent.city,
					state: newStudent.state,
					postal: newStudent.zip,
					country: 'US',
					'Email': newStudent.email,
					image: newStudent.picture,
					tag: tagService.get(programShort),
					// tagName: tagName,
					program: program,
					programShort: programShort,
					leadInfo: getLeadInfo(),//leadInfo[process.env.NODE_ENV],
					educationLevel: mapEducationLevel(newStudent.educationLevel),
					highSchoolGradDate: newStudent.graduationDate,
					application: application[process.env.NODE_ENV],
					error: '',
				};
				console.log(profile)

				return profile;
		});
	});
};

const create_monday = () => {
	return preview_monday()
		.then(profiles => Promise.all(_.map(profiles, profile => {
			return populi.addPerson(profile)
				.then(id => {
					const populiLink = `${constants[process.env.NODE_ENV].WEB_ROOT}router/contacts/people/${id}`;
					return monday.updateLeadValues(profile.mondayId, { populiLink })
						.then(update => {
							return {
								populiLink,
								firstName: profile['First Name'],
								lastName: profile['Last Name'],
							};
						}); 
				});
			})));
};

module.exports = {
	preview_monday,
	create_monday,
};
