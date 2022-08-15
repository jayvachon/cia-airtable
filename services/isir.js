const populi = require('./populi');
const _ = require('lodash');

const getFinancialAidYear = () => {
	return populi.getFinancialAidYears()
		.then(years => {
			const currentDate = new Date();
			const currentYear = _.find(years, year => {
				return currentDate >= new Date(year.startDate) && currentDate <= new Date(year.endDate);
			});
			return currentYear;
		});
};

const getNewAidApplications = () => {
	return populi.getRoleMembers('Student')
		.then(users => {
			return Promise.all(_.map(users, user => {
				return populi.getStudentInfo(user.id).then(info => console.log(info))
			}));
		})
		.then(studentInfos => {
			console.log(studentInfos)
			return studentInfos;
		})
		.catch(err => {
			throw new Error(err);
		});
};

module.exports = {
	getFinancialAidYear,
	getNewAidApplications,
};