const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const token = '';
const id = 0;
const urlPhoto = 'https://picsum.photos/200/300';
const bot = new TelegramBot(token, { polling: true })
console.log('Telegram bot succesfully started...\n');

bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if (msg.text.toLowerCase() === 'photo') {
        console.log(`Користувач ${msg.from.first_name} зробив запит фото!`);
        getPhoto().then((response) => sendPhotoMessage(chatId, response.data));
    } else {
        console.log(`Користувач ${msg.from.first_name} надіслав: ${msg.text}!`);
    }
})


function sendPhotoMessage(chatId, stream) {
    bot.sendPhoto(chatId, stream, { filename: 'filename.jpg', contentType: 'image/jpeg' });
}

function getPhoto() {
    return axios({
        url: urlPhoto,
        method: 'GET',
        responseType: 'stream',
    });
}