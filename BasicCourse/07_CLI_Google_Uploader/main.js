const inquirer = require('inquirer');
const { google } = require('googleapis');
const fs = require('fs');
const axios = require('axios');

const folderId = '1uIQqyIFWKVCUQt3CiG3c3UstgGQ9dy4U';

const credentials = require('./credentials.json');
const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

const data = {
    imagePath: null,
    fileName: null,
    fileExtension: null,
    newFilename: null,
    fileId: null,
    mimeType: null,
    filePathGoogle: null
};

function requestImage() {
    inquirer.prompt([
        {
            type: 'input',
            name: 'path',
            message: "Drag and drop your image to terminal and press Enter for unload:"
        }
    ]).then(async answers => {
        data.imagePath = answers.path;
        const pathParts = data.imagePath.split('\\');
        data.fileName = pathParts[pathParts.length - 1];
        data.fileExtension = data.fileName.split('.').pop();
        data.mimeType = `image/${data.fileExtension}`;

        console.log(`Path to file: ${data.imagePath}
        File name: ${data.fileName}
        File extension: ${data.fileExtension}`);

        await requestRename();
    });
}

function requestRename() {
    inquirer.prompt([
        {
            type: 'confirm',
            name: 'rename',
            message: `You are uploading the file with the name: ${data.fileName}.
            Would you like to change it?`
        }
    ]).then(async answers => {
        if (answers.rename) {
            await requestNewFileName();
        } else {
            await uploadFileToDrive();
        }
    })
}

async function requestNewFileName() {
    inquirer.prompt([
        {
            type: 'input',
            name: 'newFilename',
            message: "Enter new file name(WITHOUT extension aka .jpg, .png, etc.)"
        }
    ]).then(async answers => {
        data.newFilename = answers.newFilename;
        console.log(`New file name is ${data.newFilename}`);
        await uploadFileToDrive();
    });
}

function shortenUrl() {
    inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: "Would you like to shorten you link?"
        }
    ]).then(async answer => {
        const url = await getFileGoogleDriveLink();
        if (answer.confirm) {
            getTinyURL(url);
        } else {
            console.log(`Your short link: ${url}`);
        }
    });
}

async function getFileGoogleDriveLink() {
    try {
        const res = await drive.files.get({
            fileId: data.fileId,
            fields: 'webViewLink',
        });
        return res.data.webViewLink;
    } catch (error) {
        console.error('Error getFileGoogleDriveLink:', error);
        return null;
    }
}

async function uploadFileToDrive() {
    const fileMetadata = {
        name: data.newFilename !== null ? data.newFilename : data.fileName,
        parents: [folderId],
    };

    const media = {
        mimeType: data.mimeType,
        body: fs.createReadStream(data.imagePath),
    };

    try {
        const res = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });

        data.fileId = res.data.id;

        console.log(`${data.imagePath}
        Successfully uploaded!`)

        shortenUrl();
    } catch (error) {
        console.error('Error uploadFileToDrive:', error);
    }

}

async function getTinyURL(fileUrl) {
    const tinyUrl = `https://tinyurl.com/api-create.php?url=${fileUrl}`;
    axios({
        url: tinyUrl,
        method: 'GET',
        responseType: 'json',
    }).then(response => {
        console.log(`Your short link is: ${response.data}`);
    }).catch(error => {
        console.error('Error getTinyURL: ', error);
    });
}

requestImage();
