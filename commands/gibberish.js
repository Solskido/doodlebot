const _ = require("lodash");
const util = require("../lib/util.js");

const internals = {
  "GIBBERISH": [
    "meahoy",
    "memoyay",
    "meyoyyoy",
    "ladyonmamoy",
    "neofineyin",
    "meyaiovah",
    "me",
    "hoy",
    "minoy",
    "meah",
    "froyay",
    "bawahh",
    "bwah",
    "wahh",
    "dewaaagheaugaaagh",
    "bee",
    "ha",
    "bala",
    "hala",
    "ba"
  ],

  "generateGibberish": (a, b) => {
    const words = [];
    let i;
    for(i = util.random(a, b); i > 0; i--) {
      words.push(_.sample(internals.GIBBERISH));
    }

    let gibberish = "";
    _.forEach(words, (word, index) => {
      if(index === 0) {
        gibberish += util.capitalize(word);
      }
      else {
        if(util.chance(10)) {
          gibberish += ", ";
        }
        else if(util.chance(10)) {
          gibberish += ". ";
        }
        else {
          gibberish += " ";
        }

        if(gibberish.substr(-1) === ".") {
          gibberish += util.capitalize(word);
        }
        else {
          gibberish += word;
        }
      }
    });

    gibberish = gibberish.trim();
    if(util.chance(25)) {
      gibberish += "!";
    }
    else {
      gibberish += ".";
    }

    return gibberish;
  }
};

module.exports = commandObject = {

  "name": "Gibberish",
  "command": null,
  "admin": false,
  "visible": false,
  "description": "Ni hoy minoy.",
  "trigger": {
    "on": "message",
    "priority": -1,
    "filter": (message) => {
      return (util.isTalkingToMe(message)
           || util.isTalkingAboutMe(message));
    }
  },

  "register": (doodlebot) => {
    internals.doodlebot = doodlebot;

    return commandObject.trigger;
  },

  "prepare": () => {
    return !!internals.doodlebot;
  },

  "execute": (message) => {
    util.sendMessage(message.channel, internals.generateGibberish(1, 6), true);
  }
};
