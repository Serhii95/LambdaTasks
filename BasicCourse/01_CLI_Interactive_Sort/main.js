const readline = require('node:readline');

const mainQuestion = "Hello! Enter 10 words or digits dividing them in spaces: ";
const sortVariants = `How would you like to sort values: 
1. Sort the words alphabetically.
2. Display the numbers in ascending order.
3. Display the numbers in descending order.
4. Display the words in ascending order based on the number of letters in each word.
5. Show only unique words.
6. Show only the unique values from the entire set of words and numbers entered by the user.

Select (1 - 6) and press ENTER: `;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: mainQuestion
});

let saveArray = true;
let array;

rl.prompt();

rl.on('line', (answer) => {
    if (saveArray) {
        array = answer.split(" ").filter(element => element !== '').map((element) => {
            const number = Number(element);

            if (number) {
                return number;
            } else {
                return element;
            }
        });
        saveArray = false;
    }

    const wordsArray = array.filter((element) => !isNumber(element));
    const numbersArray = array.filter((element) => isNumber(element));

    switch (answer) {
        case '1':
            displayWordsAlphabeticaly(wordsArray);
            saveArray = true;
            rl.setPrompt(mainQuestion);
            rl.prompt();
            break;
        case '2':
            displayNumbersAsc(numbersArray);
            saveArray = true;
            rl.setPrompt(mainQuestion);
            rl.prompt();
            break;
        case '3':
            displayNumbersDesc(numbersArray);
            saveArray = true;
            rl.setPrompt(mainQuestion);
            rl.prompt();
            break;
        case '4':
            displayWordsSortedByItsLengthAsc(wordsArray);
            saveArray = true;
            rl.setPrompt(mainQuestion);
            rl.prompt();
            break;
        case '5':
            displayUniqueWords(wordsArray);
            saveArray = true;
            rl.setPrompt(mainQuestion);
            rl.prompt();
            break;
        case '6':
            displayUniqueWords(array);
            saveArray = true;
            rl.setPrompt(mainQuestion);
            rl.prompt();
            break;
        case 'exit':
            rl.close();
            process.exit(0);
            break;
        default:
            rl.setPrompt(sortVariants);
            rl.prompt();
            break;
    }

});


function displayWordsAlphabeticaly(words) {
    const sortedWords = words.slice().sort();
    console.log(sortedWords);
};

function isNumber(value) {
    return typeof value === 'number';
}

function displayNumbersAsc(array) {
    const coppiedArray = array.slice();

    coppiedArray.sort((number1, number2) => {
        if (number1 < number2) {
            return -1;
        }

        if (number1 > number2) {
            return 1;
        }

        return 0;
    });

    console.log(coppiedArray);
}

function displayNumbersDesc(array) {
    const coppiedArray = array.slice();

    coppiedArray.sort((number1, number2) => {
        if (number1 < number2) {
            return 1;
        }

        if (number1 > number2) {
            return -1;
        }

        return 0;
    });

    console.log(coppiedArray);
}

function displayWordsSortedByItsLengthAsc(array) {
    const coppiedArray = array.slice();

    coppiedArray.sort((str1, str2) => {
        if (str1.length < str2.length) {
            return -1;
        }

        if (str1.length > str2.length) {
            return 1;
        }

        return 0;
    });

    console.log(coppiedArray);
}

function displayUniqueWords(array) {
    const set = new Set(array);

    console.log([...set]);
}
