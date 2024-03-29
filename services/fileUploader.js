const appRoot = require('app-root-path');
require('dotenv').config({path:`${appRoot}/.env`});

const fs = require('fs');
const fetch = require('node-fetch');

/// Replace with your actual API Key
const getAccessToken = () => {
    let token = process.env.MONDAY_ACCESS_TOKEN;
    if (token === undefined) {
        throw new Error('The Monday access token (MONDAY_ACCESS_TOKEN) has not been specified in the .env file');
    } else {
        return token;
    }
};

/// Notice the /file/ endpoint - only this endpoint will support variables in this type of call
const url = 'https://api.monday.com/v2/file';

/// This is your mutation query - can also be adapted to send files to file columns instead
// const query = 'mutation add_file($file: File!, $updateId: Int!) {add_file_to_update(update_id: $updateId, file: $file) {id}}'
const query = 'mutation add_file($file: File!, $itemId: Int!, $columnId: String!) {add_file_to_column(item_id: $itemId, file: $file, column_id: $columnId) {id}}'

///This is the mapping for the API call, where you specify that a variable should be considered as the variables[file] of the request. 
///This can be called "image", or simply file - as long as it matches the name of the multipart request later down the line.
var map = {"image":"variables.file"};

/// this is the path to the file you'd like to upload to monday.com
// var upfile  = `${appRoot}/pdfs/test.pdf`;

var data = "";
const boundary = "xxxxxxxxxxxxxxx";

const upload = (itemId, columnId, upfile) => {

    var vars = {"itemId": itemId, "columnId": columnId};

    return new Promise((resolve, reject) => {

        fs.readFile(upfile, function(err, content){

            // simple catch error
            if(err){
                console.error(err);
            }

            //below, we will construct a multipart request. Take a look at the "name" within each part, as those will refer to different parts of the API call.

            // construct query part
            data += "--" + boundary + "\r\n";
            data += "Content-Disposition: form-data; name=\"query\"; \r\n";
            data += "Content-Type:application/json\r\n\r\n";
            data += "\r\n" + query + "\r\n";
            
            // construct variables part
            data += "--" + boundary + "\r\n";
            data += "Content-Disposition: form-data; name=\"variables\"; \r\n";
            data += "Content-Type:application/json \r\n\r\n";
            data += "\r\n" + JSON.stringify(vars)  + "\r\n";

            // construct map part
            data += "--" + boundary + "\r\n";
            data += "Content-Disposition: form-data; name=\"map\"; \r\n";
            data += "Content-Type:application/json\r\n\r\n";
            data += "\r\n" + JSON.stringify(map)+ "\r\n";

            // construct file part - the name needs to be the same as passed in the map part of the request. So if your map is {"image":"variables.file"}, the name should be image.
            data += "--" + boundary + "\r\n";
            data += "Content-Disposition: form-data; name=\"image\"; filename=\"" + upfile + "\"\r\n";
            data += "Content-Type:application/octet-stream\r\n\r\n";
            var payload = Buffer.concat([
                    Buffer.from(data, "utf8"),
                    new Buffer.from(content, 'binary'),
                    Buffer.from("\r\n--" + boundary + "--\r\n", "utf8"),
            ]);

            // construct request options
            var options = {
                method: 'post',
                headers: {
                  "Content-Type": "multipart/form-data; boundary=" + boundary,
                  "Authorization" : getAccessToken(),
                },
                body: payload,
            };

            // make request
            fetch(url, options)
              .then(res => { 
                    resolve(res.json())
                })
                .catch(err => {
                    reject(err);
                })
            });
    })
};

module.exports = {
    upload,
};