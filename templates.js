const _ = require('lodash');

const initial = (firstName, program, upcomingTerm) => {
	
	let career = '';
	let skill = '';
	
	if (_.includes(_.toLower(program), 'javascript')) {
		career = 'junior web developer';
		skill = 'websites';
	} else if (_.includes(_.toLower(program), 'python')) {
		career = 'Python developer';
		skill = 'programs';
	}
	else {
		career = 'junior web or Python developer';
		skill = 'websites and programs';
	}
	
	let str = `<div dir="ltr"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Hello ${firstName},</p>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Thank you for your interest in Code Immersives, a one-of-a-kind accredited program covering everything from the fundamentals of programming to full stack development and cloud computing! Please read on for basic information about the program and how to enroll:</p>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt"><b>What's the cost?</b></p>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Tuition for the program is $17,995, and we accept various forms of assistance to help cover this cost, including GI Bill benefits, Pell Grants, government student loans and private student loans through Climb.</p>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt"><b>What's the schedule?</b></p>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Classes run Monday-Thursday, from 10:30 AM to 4:00 PM, with an hour lunch break in the afternoon. Unlike a coding “boot camp,” we take a more measured pace so that everyone with a desire to learn has the opportunity to succeed. In less than a year, you will be prepared to enter the industry as a software developer.</p>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt"><b>How do I enroll?</b></p>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">We are currently enrolling students in our upcoming ${upcomingTerm} term, and we are offering both online and in-person instruction (for when the coronavirus pandemic subsides). <b>If you are interested in attending, simply reply to this email with an indication that you’d like to proceed</b> and I will send you the relevant materials!</p>
		<br>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Warm regards,</p>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Jay Vachon</p></div>`;

	return str;
};

module.exports = {
	initial,
};