// NOTE:
// This is a Google Apps Script, accessible from here: https://script.google.com/home/projects/1Fdaka0irt66oAzgY-8ovYOt7vjmudosN9I3t1CqnqNu3GUBZdzWW0rPs/edit
// The copy here is just a back up. It doesn't do anything.

const sheetId = '1dEYyFocsOdl9sXbGz9DGGINfnbplAZAwn4T-SfDxosA';
const acceptanceLettersDir = '1jQehzhSK26Ly7PVXv36Uj8ZIUYKSLUl1';

function createDocuments() {

  // Get the headers and students to generate letters for
  let headers = Sheets.Spreadsheets.Values.get(sheetId, 'A1:I1').values[0];
  let students = Sheets.Spreadsheets.Values.get(sheetId, 'A2:I1000').values;

  for (let i = 0; i < students.length; i ++) {

    let student = parseStudent(headers, students[i]);

    // skip students that already have acceptance letters
    if (student !== undefined) {
      let result = createLetter(student);

      // update the student row with a link to the new acceptance letter
      var valueRange = Sheets.newValueRange();
      valueRange.values = [[result.url]];
      let range = `I${i+2}:I${i+2}`;
      Sheets.Spreadsheets.Values.update(valueRange, sheetId, range, {valueInputOption: 'RAW'});

      // convert the doc to pdf
      convertPDF(result.id);

      // email the student
      sendEmail(student, result.id);
    }
  } 
}

function parseStudent(headers, student) {
  if (student.length >= 9) {
    return undefined;
  } else {
    let obj = {};
    for (let i = 0; i < student.length; i ++) {
      obj[headers[i]] = student[i];
    }
    return obj;
  }
}

function createLetter(student) {

  let docName = `${student.LastName}${student.FirstName}_LetterOfAcceptance`;
  let folder = DriveApp.getFolderById(acceptanceLettersDir);
  let documentId = DriveApp
    .getFileById('1C1-gzuXYKknOaOYdMRceS-NUm5-uADi4hXKgHLLB2tE')
    .makeCopy(docName, folder)
    .getId();

  let body = DocumentApp.openById(documentId).getBody();
  let keys = Object.keys(student);
  for (let i = 1; i < keys.length; i ++) {
    body.replaceText(`{{${keys[i]}}}`, student[keys[i]]);
  }
  DocumentApp.openById(documentId).saveAndClose();

  return { id: documentId, url: DriveApp.getFileById(documentId).getUrl() };
}

function convertPDF(documentId) {
  let doc = DocumentApp.openById(documentId);
  let docblob = doc.getAs('application/pdf');
  docblob.setName(doc.getName() + ".pdf");
  let file = DriveApp.createFile(docblob);
  let fileId = file.getId();
  moveFileId(fileId, acceptanceLettersDir);
}

function moveFileId(fileId, toFolderId) {
   var file = DriveApp.getFileById(fileId);
   var source_folder = DriveApp.getFileById(fileId).getParents().next();
   var folder = DriveApp.getFolderById(toFolderId)
   folder.addFile(file);
   source_folder.removeFile(file);
}

function sendEmail(student, documentId) {
  let email = student.Email;
  let letter = DriveApp.getFileById(documentId);
  let msg = message(student.FirstName);
  let plainTextMessage = "On behalf of Code Immersives, I'm pleased to send you this letter of acceptance! As a reminder, orientation will be held online on Friday, May 7th, with classes beginning on Monday, May 10th. I'll send out more information in the week leading up to orientation (including a link to the Zoom meeting), but for now, no further action is required on your part. Have a lovely week! - Jay";

  MailApp.sendEmail(email, 'Your acceptance letter: Welcome to Code Immersives!', plainTextMessage, {
    attachments: [letter],
    htmlBody: msg,
  });
}

function message(firstName) {
  return `<div dir="ltr"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Hi ${firstName},</p>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">On behalf of Code Immersives, I'm pleased to send you this letter of acceptance! As a reminder, orientation will be held online on Friday, May 7th, with classes beginning on Monday, May 10th. I'll send out more information in the week leading up to orientation (including a link to the Zoom meeting), but for now, no further action is required on your part. Have a lovely week!</p>
		<br>
		<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">Jay</p> ${signature}`;
}

const signature = `<div><br></div>
	--
	<br>
	<div dir="ltr"><div dir="ltr"><div><div dir="ltr"><div><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div dir="ltr"><div style="font-size:small"><span style="color:rgb(12,52,61)"><font face="tahoma, sans-serif">Department of Admissions</font></span></div><div style="font-size:small"><div style="font-size:12.8px"><div style="font-size:small"><font size="2" color="#0c343d" face="tahoma, sans-serif">Code Immersives NYC&nbsp;</font></div><div style="font-size:small"><font size="2" color="#0c343d" face="tahoma, sans-serif">630 Ninth Ave (Suite 901)<br>New York, NY 10036<br>F: (917) 398-9853<br>T: (646) 215-2200 ext: 1014<br></font></div><div style="font-size:small"><font size="2" color="#0000ff" face="tahoma, sans-serif"><b><br></b></font></div><div style="font-size:small"><font size="2" color="#0c343d" face="tahoma, sans-serif"><a href="http://www.codeimmersives.com/" style="color:rgb(17,85,204)" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://www.codeimmersives.com/&amp;source=gmail&amp;ust=1614705860050000&amp;usg=AFQjCNFhf6ldOJYctw7La3Y2aMPF_HIoHA">Code Immersives Homepage</a>&nbsp;</font></div><div style="font-size:small"><font size="2" color="#0c343d" face="tahoma, sans-serif"><a href="https://www.facebook.com/codeimmersives/" style="color:rgb(17,85,204)" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://www.facebook.com/codeimmersives/&amp;source=gmail&amp;ust=1614705860050000&amp;usg=AFQjCNGs74CSFvl9gbCfaUexKAqMszr2Qw">Code Immersives Facebook</a>&nbsp;</font></div><div style="font-size:small"><font size="2" color="#0c343d" face="tahoma, sans-serif"><a href="https://twitter.com/codeimmersives" style="color:rgb(17,85,204)" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://twitter.com/codeimmersives&amp;source=gmail&amp;ust=1614705860050000&amp;usg=AFQjCNEyjym_xCRdhm2WjGW0zSqzYexcyA">Code Immersives Twitter</a>&nbsp;</font></div><div style="font-size:small"><font face="tahoma, sans-serif" style="color:rgb(17,85,204)"><a href="http://www.instagram.com/codeimmersives/" style="color:rgb(17,85,204)" target="_blank" data-saferedirecturl="https://www.google.com/url?q=http://www.instagram.com/codeimmersives/&amp;source=gmail&amp;ust=1614705860050000&amp;usg=AFQjCNGGxg6jq22ezepbXWRpBWdHJD4E5A">Code Immersives Instagram</a></font></div><div style="font-size:small"><font color="#0c343d" face="tahoma, sans-serif"><a href="https://benefits.va.gov/gibill/" style="color:rgb(17,85,204)" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://benefits.va.gov/gibill/&amp;source=gmail&amp;ust=1614705860050000&amp;usg=AFQjCNEZySKbfdYXKRL-YtYi7TpuC4dkmA">GI Bill Benefits Information</a></font></div><div style="font-size:small"><font color="#0c343d" face="tahoma, sans-serif"><a href="https://www.vets.gov/education/apply/" style="color:rgb(17,85,204)" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://www.vets.gov/education/apply/&amp;source=gmail&amp;ust=1614705860050000&amp;usg=AFQjCNEdwf0xvQpmAtIQ4uUNqdQBbwga5Q">Apply for GI Bill Benefits/COE</a></font></div><div style="font-size:small"><a href="https://fafsa.ed.gov/" style="color:rgb(17,85,204);font-family:tahoma,sans-serif" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://fafsa.ed.gov/&amp;source=gmail&amp;ust=1614705860050000&amp;usg=AFQjCNFQhG680zBZ2hzKbAFjM9_-2O0Yrg">Free Application for Federal Student Aid - (FASFA)</a><br></div><div style="font-size:small"><br></div><div style="font-size:small"><font color="#0c343d" face="tahoma, sans-serif">Financial Aid, school code:&nbsp;<b>0 4 2 0 6 2&nbsp; &nbsp; &nbsp;&nbsp;</b></font><span style="color:rgb(12,52,61);font-family:tahoma,sans-serif">Approved VA Facility Code:&nbsp;</span><b style="color:rgb(12,52,61);font-family:tahoma,sans-serif">2 5 3 6 9 1 3 2</b></div><div style="font-size:small"><br></div></div><div style="font-size:12.8px"><font face="tahoma, sans-serif"><font size="2"><b>Confidentiality Notice:</b></font><font size="2"><b>&nbsp;&nbsp;<span style="color:rgb(0,0,0)">This message and its contents are confidential. If you received this message in error, do not use or rely upon it. Instead, please inform the sender and then delete it. Thank you.</span></b></font></font></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div>
	`;