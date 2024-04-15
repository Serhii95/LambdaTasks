    const TelegramBot = require('node-telegram-bot-api');
    const axios = require('axios');
    const http = require('http');
    const socketio = require('socket.io');
    const socketioClient = require('socket.io-client');

    const token = process.env.TG_TOKEN;
    const urlAPIWhether = 'https://api.openweathermap.org/data/2.5/forecast';
    const urlAPIFoundCity = 'http://api.openweathermap.org/geo/1.0/direct';
    const hostingUrl = process.env.HOSTING_URL;
    const urlPrivatExchangeCurrencyApi = 'https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5';
    const weatherApiKey = process.env.WEATHER_API_KEY;
    const PORT = process.env.PORT || 3000;

    const WAKE_UP_REQUEST_INTERVAL = 60000;

    let userCity = {};

    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('Server is running\n');
    })

    const io = socketio(server);
    const ioClient = socketioClient(hostingUrl);

    setInterval(() => {
        console.log("Sending awake request!");

        ioClient.emit('keepAlive', { message: 'Server is alive!' });
    }, WAKE_UP_REQUEST_INTERVAL);

    io.on('connection', (socket) => {
        console.log('A client connected');

        socket.on('keepAlive', (data) => {
            console.log('Keep alive message received:', data);
        });
    });

    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

    const bot = new TelegramBot(token, { polling: true });
    console.log('Telegram bot successfully started...\n');

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

    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        await bot.sendMessage(chatId, 'Виберіть опцію:', mainMenuKeyboard);
    });

    bot.onText(/\/Погода/, async (msg) => {
        const chatId = msg.chat.id;
        userCity[chatId] = {};
        await askForCity(chatId);
    });

    bot.onText(/\/Курс валют/, async (msg) => {
        const chatId = msg.chat.id;
        await bot.sendMessage(chatId, 'Виберіть валюту:', currencyMenuKeyboard);
    });

    bot.onText(/Кожні 3 години|Кожні 6 годин|Вітер/, async (msg) => {
        const chatId = msg.chat.id;
        const option = msg.text;
        const city = userCity[chatId].city;
        switch (option) {
            case 'Кожні 3 години':
                await sendCityWeather(chatId, city, '3hourInterval');
                break;
            case 'Кожні 6 годин':
                await sendCityWeather(chatId, city, '6hourInterval');
                break;
            case 'Вітер':
                await sendCityWind(chatId, city);
                break;
            default:
                await bot.sendMessage(chatId, 'Невідома опція');
        }
    });

    bot.onText(/USD|EUR/, async (msg) => {
        const chatId = msg.chat.id;
        const option = msg.text;
        switch (option) {
            case 'USD':
                await sendExchangeCurrency(chatId, 'USD')
                break;
            case 'EUR':
                await sendExchangeCurrency(chatId, 'EUR')
                break;
            default:
                await bot.sendMessage(chatId, 'Невідома опція');
        }
    });

    bot.onText(/Попереднє меню/, async (msg) => {
        const chatId = msg.chat.id;
        if (userCity[chatId]) {
            userCity[chatId].waitingForCity = false;
        }
        await bot.sendMessage(chatId, 'Виберіть опцію:', mainMenuKeyboard);
    });

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const city = msg.text;

        if (userCity[chatId] && userCity[chatId].waitingForCity) {
            userCity[chatId].city = city;
            userCity[chatId].waitingForCity = false;
            await bot.sendMessage(chatId, `Ви вибрали місто: ${city}`, weatherMenuKeyboard);
        }

    });

    bot.on("polling_error", console.log);

    const askForCity = async (chatId) => {
        userCity[chatId].waitingForCity = true;
        return bot.sendMessage(chatId, 'Введіть місто:', cityKeyboard);
    };

    async function sendCityWeather(chatId, city, interval) {
        try {
            const cityCoords = await getLatitudeAndLongitude(city);
            if (cityCoords === null) {
                await sendTextMessage(chatId, `Місто не знайдено: ${city}`);
                return;
            }

            const weather = await getWeather(cityCoords.lat, cityCoords.lon);

            let weatherDataArr = weather.list;
            if (interval === '6hourInterval') {
                weatherDataArr = [];
                for (let index = 0; index < weather.list.length; index += 2) {
                    const element = weather.list[index];
                    weatherDataArr.push(element);
                }
            }
            
            await sendTextMessage(chatId, `Прогноз погоди в ${city}:\n${formatWeather(weatherDataArr)}`);
        } catch (error) {
            console.error(error)
            await sendTextMessage(chatId, `Виникла помилка на сервері!`);
        }
    }

    async function sendCityWind(chatId, city) {
        try {
            const cityCoords = await getLatitudeAndLongitude(city);
            if (cityCoords === null) {
                await sendTextMessage(chatId, `Місто не знайдено: ${city}`);
                return;
            }

            const weather = await getWeather(cityCoords.lat, cityCoords.lon);
            let weatherDataArr = weather.list;
            await sendTextMessage(chatId, formatWindWeather(weatherDataArr));
        } catch (error) {
            console.error(error);
            await sendTextMessage(chatId, `Виникла помилка на сервері!`);
        }
    }

    async function sendExchangeCurrency(chatId, currency) {
        const response = await getExchangeCurrency();
        let ExchangeCurrencyDataArr = response.data;

        return sendTextMessage(chatId, formatExchangeCurrency(ExchangeCurrencyDataArr, currency));
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
        })
            .then((response) => response.data)
            .catch((error) => {
                throw new Error("Виникла помилка отримання інформації про погоду в місті!", error)
            });
    }

    async function getLatitudeAndLongitude(city) {
        const data = await axios({
            url: urlAPIFoundCity,
            method: 'GET',
            params: {
                q: city,
                limit: 1,
                appid: weatherApiKey
            },
            responseType: 'json',
        })
            .then((response) => response.data)
            .catch((error) => {
                throw new Error("Виникла помилка отримання даних про місто!", error)
            });

        if (data && data.length) {
            return {
                lat: data[0].lat,
                lon: data[0].lon
            };
        }

        return null;
    }

    async function getExchangeCurrency() {
        return axios({
            url: urlPrivatExchangeCurrencyApi,
            method: 'GET',
            responseType: 'json',
        }).catch((error) => {
            console.error("Помилка отримання даних про валюту", error)
        });
    }

    const formatWeather=(weatherDataArr)=> {
        let result = '';
        let currentDate = null;

        for (let index = 0; index < weatherDataArr.length; index++) {
            const weather = weatherDataArr[index];
            const date = new Date(weather.dt * 1000);
            const formattedDate = toFormattedDate(date);
            if (currentDate !== formattedDate) {
                result += `\n${formattedDate}:\n`;
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

    const formatWindWeather=(weatherDataArr)=> {
        let result = '';
        let currentDate = null;

        for (let index = 0; index < weatherDataArr.length; index++) {
            const weather = weatherDataArr[index];
            const date = new Date(weather.dt * 1000);
            const formattedDate = toFormattedDate(date);
            if (currentDate !== formattedDate) {
                result += `\n${formattedDate}:\n`;
            }
            currentDate = formattedDate;
            const hour = toFormattedHours(date);
            const wind = Math.round(weather.wind.speed);

            result += `\t\t\t${hour} ${wind} м/с\n`;
        }
        return result;
    }

    const sendTextMessage=async(chatId, text)=> {
        return bot.sendMessage(chatId, text);
    }

    const toFormattedDate=(date)=> {
        const daysOfWeek = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];
        const months = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];

        const dayOfWeek = daysOfWeek[date.getDay()];
        const dayOfMonth = date.getDate();
        const monthName = months[date.getMonth()];

        return `${dayOfWeek}, ${dayOfMonth} ${monthName}`;
    }

    const toFormattedHours=(date)=> {
        const hour = date.getHours();
        const formattedHour = hour < 10 ? `0${hour}` : hour;
        return `${formattedHour}:00`;
    }

    const formatExchangeCurrency=(exchangeCurrencyDataArr, currency)=> {
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
