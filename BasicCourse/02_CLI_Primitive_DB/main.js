const inquirer = require('inquirer');
const fs = require('fs');

//const users = [];
const databaseFile = 'database.txt';

function addUserToDB(user) {
  const usersJSON = JSON.stringify(user);
  fs.appendFileSync(databaseFile, usersJSON + '\n');
}
function getUsersFromDB() {
  const data = fs.readFileSync(databaseFile, 'utf-8').trim();
  if (data === '') {
    return [];
  }
  return data.split('\n').map((element) => JSON.parse(element));
}

function findUsersByName(name) {
  const data = fs.readFileSync(databaseFile, 'utf8').trim();
  if (data === '') {
    return null;
  }
  const users = data.split('\n').map((element) => JSON.parse(element));
  const foundUsers = users.filter(user => user.name.toLowerCase() === name.toLowerCase());
  return foundUsers;
}

function addUser() {
  inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: "Enter the user's name. To cancel press ENTER:"
    }
  ]).then(answers => {
    if (answers.name === '') {
      findUser();
    } else {
      inquirer.prompt([
        {
          type: 'list',
          name: 'gender',
          message: 'Choose your Gender:',
          choices: ['male', 'female']
        },
        {
          type: 'number ',
          name: 'age',
          message: 'Enter your age:'
        }
      ]).then(userDetails => {
        addUserToDB({
          // users.push({
          name: answers.name,
          gender: userDetails.gender,
          age: userDetails.age
        });
        addUser();
      });
    }
  });
}

function findUser() {
  inquirer.prompt([
    {
      type: 'confirm',
      name: 'search',
      message: 'Would you to search values in DB?'
    }
  ]).then(answers => {
    console.log(getUsersFromDB());
    if (answers.search) {
      inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: "Enter user's name you wanna find in DB:"
        }
      ]).then(searchAnswer => {
        //const foundUser = users.find(user => user.name === searchAnswer.name);
        const foundUsers = findUsersByName(searchAnswer.name);
        if (foundUsers.length===0) {
          console.log('User not found.');
        }

        if (foundUsers.length === 1) {
          console.log('User ' + searchAnswer.name + ' was found.');
        } else {
          console.log('Users with name ' + searchAnswer.name + ' were found.');
        }
        console.log(foundUsers);    

        findUser();
      });
    } else {
      addUser();
    }
  });
}
addUser();
