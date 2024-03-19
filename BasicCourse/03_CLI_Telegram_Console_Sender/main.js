const { program } = require('commander');
const TelegramBot = require('node-telegram-bot-api');

const token = "";
const chatId = 0;
const bot = new TelegramBot(token, { polling: true });

program
  .command('message <message>')
  .alias('m')
  .description('Send message to Telegram Bot')
  .action(sendTextMessage);

program
  .command('photo <path>')
  .alias('p')
  .description('Send photo to Telegram Bot. Just drag and drop it to console after p-flag.')
  .action(sendPhotoMessage);

program
  .parse(process.argv);


// bot.on('message', (msg) => {
//   const id = msg.chat.id;

// //   console.log(id);
//   console.log(msg);
// })

function sendTextMessage(text) {
  bot.sendMessage(chatId, text).then(exit);
}

function sendPhotoMessage(photo) {
  bot.sendPhoto(chatId, photo).then(exit);
}

function exit() {
  process.exit(0);
}