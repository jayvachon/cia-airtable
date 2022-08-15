const _ = require('lodash');

const signature = `<div><br></div>
	--
	<br>
	<div dir="ltr"><div dir="ltr"><div><div dir="ltr"><div><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div style="font-size:small"><span style="color:rgb(12,52,61)"><font face="tahoma, sans-serif">Department of Admissions</font></span></div><div style="font-size:small"><div style="font-size:12.8px"><div style="font-size:small"><font size="2" color="#0c343d" face="tahoma, sans-serif">Code Immersives NYC&nbsp;</font></div><div style="font-size:small"><font size="2" color="#0c343d" face="tahoma, sans-serif">630 Ninth Ave (Suite 901)<br>New York, NY 10036<br>F: (917) 398-9853<br>T: (646) 215-2200 ext: 1014<br></font></div><div style="font-size:small"><font size="2" color="#0000ff" face="tahoma, sans-serif"><b><br></b></font></div><div style="font-size:small"><font size="2" color="#0c343d" face="tahoma, sans-serif"><a href="http://www.codeimmersives.com/" style="color:rgb(17,85,204)" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://www.codeimmersives.com/&amp;source=gmail&amp;ust=1614705860050000&amp;usg=AFQjCNFhf6ldOJYctw7La3Y2aMPF_HIoHA">Code Immersives Homepage</a>&nbsp;</font></div><div style="font-size:small"><font size="2" color="#0c343d" face="tahoma, sans-serif"><a href="https://www.facebook.com/codeimmersives/" style="color:rgb(17,85,204)" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://www.facebook.com/codeimmersives/&amp;source=gmail&amp;ust=1614705860050000&amp;usg=AFQjCNGs74CSFvl9gbCfaUexKAqMszr2Qw">Code Immersives Facebook</a>&nbsp;</font></div><div style="font-size:small"><font size="2" color="#0c343d" face="tahoma, sans-serif"><a href="https://twitter.com/codeimmersives" style="color:rgb(17,85,204)" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://twitter.com/codeimmersives&amp;source=gmail&amp;ust=1614705860050000&amp;usg=AFQjCNEyjym_xCRdhm2WjGW0zSqzYexcyA">Code Immersives Twitter</a>&nbsp;</font></div><div style="font-size:small"><font face="tahoma, sans-serif" style="color:rgb(17,85,204)"><a href="http://www.instagram.com/codeimmersives/" style="color:rgb(17,85,204)" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://www.instagram.com/codeimmersives/&amp;source=gmail&amp;ust=1614705860050000&amp;usg=AFQjCNGGxg6jq22ezepbXWRpBWdHJD4E5A">Code Immersives Instagram</a></font></div><div style="font-size:small"><font color="#0c343d" face="tahoma, sans-serif"><a href="https://benefits.va.gov/gibill/" style="color:rgb(17,85,204)" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://benefits.va.gov/gibill/&amp;source=gmail&amp;ust=1614705860050000&amp;usg=AFQjCNEZySKbfdYXKRL-YtYi7TpuC4dkmA">GI Bill Benefits Information</a></font></div><div style="font-size:small"><font color="#0c343d" face="tahoma, sans-serif"><a href="https://www.vets.gov/education/apply/" style="color:rgb(17,85,204)" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://www.vets.gov/education/apply/&amp;source=gmail&amp;ust=1614705860050000&amp;usg=AFQjCNEdwf0xvQpmAtIQ4uUNqdQBbwga5Q">Apply for GI Bill Benefits/COE</a></font></div><div style="font-size:small"><a href="https://fafsa.ed.gov/" style="color:rgb(17,85,204);font-family:tahoma,sans-serif" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://fafsa.ed.gov/&amp;source=gmail&amp;ust=1614705860050000&amp;usg=AFQjCNFQhG680zBZ2hzKbAFjM9_-2O0Yrg">Free Application for Federal Student Aid - (FASFA)</a><br></div><div style="font-size:small"><br></div><div style="font-size:small"><font color="#0c343d" face="tahoma, sans-serif">Financial Aid, school code:&nbsp;<b>0 4 2 0 6 2&nbsp; &nbsp; &nbsp;&nbsp;</b></font><span style="color:rgb(12,52,61);font-family:tahoma,sans-serif">Approved VA Facility Code:&nbsp;</span><b style="color:rgb(12,52,61);font-family:tahoma,sans-serif">2 5 3 6 9 1 3 2</b></div><div style="font-size:small"><br></div></div><div style="font-size:12.8px"><font face="tahoma, sans-serif"><font size="2"><b>Confidentiality Notice:</b></font><font size="2"><b>&nbsp;&nbsp;<span style="color:rgb(0,0,0)">This message and its contents are confidential. If you received this message in error, do not use or rely upon it. Instead, please inform the sender and then delete it. Thank you.</span></b></font></font></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div>
	`;

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
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Thank you for your interest in Code Immersives, a one-of-a-kind software development program covering everything from the fundamentals of programming to full stack development and cloud computing! Please read on for basic information about the program and how to enroll:</p>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt"><b>What courses do you offer?</b></p>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">We currently offer two courses: a 60-week Associate of Science in Computer Science and Web architecture course and a 45-week Web Development certificate course.</p>
		<br>
			<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Both courses start from the ground up with the fundamentals of programming. They cover front end development with HTML, CSS, and the JavaScript framework React.js; back end development using the JavaScript framework Node.js; and cloud computing with Amazon Web Services. The associate course also includes general education classes and an additional term of coding classes.</p>
		<br>
			<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">We deliver our programs using a hybrid modality. This means that the majority of your class days are conducted online via Zoom, with the exception of 1-4 class days conducted in person at the end of each term. You have the option of attending these in-person classes at either our New York City or Atlanta location.</p>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt"><b>What's the cost?</b></p>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Tuition for the associate course is $29,995, and tuition for the certificate course is $19,995. We accept various forms of assistance to help cover this cost, including GI Bill benefits, Pell Grants, government student loans and private student loans through Climb. <strong>Veterans enrolled in our programs receive an in person housing allowance based off the zip code 30303.</strong></p>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt"><b>What's the schedule?</b></p>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Classes run Monday-Thursday, from 10:30 AM to 4:00 PM, with an hour lunch break in the afternoon. Unlike a coding “boot camp,” we take a more measured pace so that everyone with a desire to learn has the opportunity to succeed.</p>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt"><b>How do I enroll?</b></p>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">We are currently enrolling students in our upcoming ${upcomingTerm} term, and we are offering both online and in-person instruction (for when the coronavirus pandemic subsides). <b>If you are interested in attending, simply reply to this email with an indication that you’d like to proceed</b> and I will send you the relevant materials!</p>
		<br>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Warm regards,</p>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Jay Vachon</p></div>
		${signature}`;

	return str;
};

const repeat = (firstName, program, upcomingTerm) => {
	let str = `<div dir="ltr"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Hi ${firstName},</p>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">I noticed that you filled out the form on our website again indicating your interest in attending one of our coding programs. If you have any questions or if you'd like to proceed with enrollment for our upcoming ${upcomingTerm} term, simply respond to this email and I can start the process with you!</p>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Jay</p>
		${signature}`;
	return str;
};

const enrollmentInformation = (firstName) => {
	let str = `<div dir="ltr"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Hi ${firstName},</p>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">I'm happy to hear that you'd like to sign up! To get started, please see the attached documents to enroll in our upcoming January 24th term:</p>
		<br>
		<ul>
			<li><strong>Enrollment Information packet:</strong> read carefully and return the requested documents.</li>
			<li><strong>New York State Student Rights:</strong> for your reference.</li>
		</ul>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Due to the pandemic, we will be offering students the option of taking classes online or in-person beginning in January.</p>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">If you have any questions, I'll be happy to help!</p>
		<br>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Warmly,</p>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Jay</p></div>
		${signature}`;
	return str;
};

module.exports = {
	initial,
	repeat,
	enrollmentInformation,
};