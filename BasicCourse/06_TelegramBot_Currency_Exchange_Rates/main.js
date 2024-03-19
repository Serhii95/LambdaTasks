const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TG_TOKEN;
const urlAPIWhether = 'https://api.openweathermap.org/data/2.5/forecast';
const urlAPIFoundCity = 'http://api.openweathermap.org/geo/1.0/direct';
const urlPrivatExchangeCurrencyApi = 'https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5';
const weatherApiKey = process.env.WEATHER_API_KEY;

const bot = new TelegramBot(token, { polling: true });

console.log('Telegram bot successfully started...\n');
let userCity = {};

const mainMenuKeyboard = {
    reply_markup: {
        keyboard: [
            ['/Погода', '/Курс валют']
        ],
        resize_keyboard: true
    }
};

const weatherMenuKeyboard = {
    reply_markup: {
        keyboard: [
            ['Кожні 3 години', 'Кожні 6 годин'],
            ['Вітер'],
            ['Попереднє меню']
        ],
        resize_keyboard: true
    }
};

const currencyMenuKeyboard = {
    reply_markup: {
        keyboard: [
            ['USD', 'EUR'],
            ['Попереднє меню']
        ],
        resize_keyboard: true
    }
};

const cityKeyboard = {
    reply_markup: {
        keyboard: [
            ['Попереднє меню']
        ],
        resize_keyboard: true
    }
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Виберіть опцію:', mainMenuKeyboard);
});

bot.onText(/\/Погода/, async (msg) => {
    const chatId = msg.chat.id;
    userCity[chatId] = {};
    askForCity(chatId);
});

bot.onText(/\/Курс валют/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Виберіть валюту:', currencyMenuKeyboard);
});

bot.onText(/Кожні 3 години|Кожні 6 годин|Вітер/, (msg) => {
    const chatId = msg.chat.id;
    const option = msg.text;
    const city = userCity[chatId].city;
    switch (option) {
        case 'Кожні 3 години':
            sendCityWeather(chatId, city, '3hourInterval');
            break;
        case 'Кожні 6 годин':
            sendCityWeather(chatId, city, '6hourInterval');
            break;
        case 'Вітер':
            sendCityWind(chatId, city);
            break;
        default:
            bot.sendMessage(chatId, 'Невідома опція');
    }
});

bot.onText(/USD|EUR/, (msg) => {
    const chatId = msg.chat.id;
    const option = msg.text;
    switch (option) {
        case 'USD':
            sendExchangeCurrency(chatId, 'USD')
            break;
        case 'EUR':
            sendExchangeCurrency(chatId, 'EUR')
            break;
        default:
            bot.sendMessage(chatId, 'Невідома опція');
    }
});

bot.onText(/Попереднє меню/, (msg) => {
    const chatId = msg.chat.id;
    if (userCity[chatId]) {
        userCity[chatId].waitingForCity = false;
    }
    bot.sendMessage(chatId, 'Виберіть опцію:', mainMenuKeyboard);
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const city = msg.text;

    if (userCity[chatId] && userCity[chatId].waitingForCity) {
        userCity[chatId].city = city;
        userCity[chatId].waitingForCity = false;
        bot.sendMessage(chatId, `Ви вибрали місто: ${city}`, weatherMenuKeyboard);
    }

});

bot.on("polling_error", console.log);

const askForCity = (chatId) => {
    userCity[chatId].waitingForCity = true;
    bot.sendMessage(chatId, 'Введіть місто:', cityKeyboard);
};

async function sendCityWeather(chatId, city, interval) {
    const cityCoords = await getLatitudeAndLongitude(city);
    if (cityCoords === null) {
        sendTextMessage(chatId, `Такого міста не існує!`);
        return;
    }

    const response = await getWeather(cityCoords.lat, cityCoords.lon);

    let weatherDataArr = response.data.list;
    if (interval === '6hourInterval') {
        weatherDataArr = [];
        for (let index = 0; index < response.data.list.length; index += 2) {
            const element = response.data.list[index];
            weatherDataArr.push(element);
        }
    }
    sendTextMessage(chatId, `Прогноз погоди в ${city}:\n${formatWeather(weatherDataArr)}`);
}

async function sendCityWind(chatId, city) {
    const cityCoords = await getLatitudeAndLongitude(city);
    if (cityCoords === null) {
        sendTextMessage(chatId, `Такого міста не існує!`);
        return;
    }

    const response = await getWeather(cityCoords.lat, cityCoords.lon);
    let weatherDataArr = response.data.list;
    sendTextMessage(chatId, formatWindWeather(weatherDataArr));
}

async function sendExchangeCurrency(chatId, currency) {
    const response = await getExchangeCurrency();
    let ExchangeCurrencyDataArr = response.data;

    sendTextMessage(chatId, formatExchangeCurrency(ExchangeCurrencyDataArr, currency));
}

async function getWeather(lat, lon) {
    return axios({
        url: urlAPIWhether,
        method: 'GET',
        params: {
            lat: lat,
            lon: lon,
            appid: weatherApiKey,
            units: 'metric',
            lang: 'ua'
        },
        responseType: 'json',
    }).catch(console.log);
}

async function getLatitudeAndLongitude(city) {
    const response = await axios({
        url: urlAPIFoundCity,
        method: 'GET',
        params: {
            q: city,
            limit: 1,
            appid: weatherApiKey
        },
        responseType: 'json',
    }).catch((error) => {
        console.log(error);
    });

    if (!response.data.length) {
        return null;
    }

    return {
        lat: response.data[0].lat,
        lon: response.data[0].lon
    };
}

async function getExchangeCurrency() {
    return axios({
        url: urlPrivatExchangeCurrencyApi,
        method: 'GET',
        responseType: 'json',
    }).catch(console.log);
}

function formatWeather(weatherDataArr) {
    let result = '';
    let currentDate = null;

    for (let index = 0; index < weatherDataArr.length; index++) {
        const weather = weatherDataArr[index];
        const date = new Date(weather.dt * 1000);
        const formattedDate = toFormattedDate(date);
        if (currentDate !== formattedDate) {
            result += `${formattedDate}:\n`;
        }
        currentDate = formattedDate;
        const hour = toFormattedHours(date);
        const temperature = Math.round(weather.main.temp);
        const temperatureCheckMark = temperature > 0 ? `+${temperature}` : temperature;
        const temperatureFeelsLike = Math.round(weather.main.feels_like);
        const temperatureFeelsLikeCheckMark = temperatureFeelsLike > 0 ? `+${temperatureFeelsLike}` : temperatureFeelsLike;
        const weatherDescription = weather.weather[0].description;

        result += `\t\t\t${hour} ${temperatureCheckMark}°C, відчувається: ${temperatureFeelsLikeCheckMark}°C,  ${weatherDescription}\n`;
    }
    return result;
}

function formatWindWeather(weatherDataArr) {
    let result = '';
    let currentDate = null;

    for (let index = 0; index < weatherDataArr.length; index++) {
        const weather = weatherDataArr[index];
        const date = new Date(weather.dt * 1000);
        const formattedDate = toFormattedDate(date);
        if (currentDate !== formattedDate) {
            result += `${formattedDate}:\n`;
        }
        currentDate = formattedDate;
        const hour = toFormattedHours(date);
        const wind = Math.round(weather.wind.speed);

        result += `\t\t\t${hour} ${wind} м/с\n`;
    }
    return result;
}
function toFormattedDate(date) {
    const daysOfWeek = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];
    const months = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];

    const dayOfWeek = daysOfWeek[date.getDay()];
    const dayOfMonth = date.getDate();
    const monthName = months[date.getMonth()];

    return `${dayOfWeek}, ${dayOfMonth} ${monthName}`;
}

function toFormattedHours(date) {
    const hour = date.getHours();
    const formattedHour = hour < 10 ? `0${hour}` : hour;
    return `${formattedHour}:00`;
}

function formatExchangeCurrency(exchangeCurrencyDataArr, currency) {
    let i = 0;
    if (currency === 'USD') {
        i = 1;
    }

    let exchangeCurrency = exchangeCurrencyDataArr[i];
    const baseCurrency = exchangeCurrency.base_ccy;
    const currencyBuy = exchangeCurrency.buy;
    const currencySale = exchangeCurrency.sale;

    return `${baseCurrency}->${currency}
    Покупка: ${currencyBuy}
    Продаж: ${currencySale}`;
}

function sendTextMessage(chatId, text) {
    bot.sendMessage(chatId, text);
}