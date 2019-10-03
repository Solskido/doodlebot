const _ = require("lodash");
const util = require("../lib/util.js");

const internals = {

  "NUMBER_WORDS": [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten"
  ],

  "wordToNumber": (word) => {
    let number = 0;
    try {
      number = parseInt(word, 10);
    }
    catch(e) {
      number = 0;
    }

    if((number !== 0)
    && !_.isNaN(number)) {
      return number;
    }

    number = _.indexOf(internals.NUMBER_WORDS, word);

    return Math.max(0, number);
  },

  "getHotWordIndexes": (words, hotWords) => {
    const indexes = [];
    _.forEach(words, (word, i) => {
      const matches = _.findIndex(hotWords, (hotWord) => {
        return (hotWord.toLowerCase() === word.toLowerCase());
      });

      if(matches >= 0) {
        indexes.push(i);
      }
    });

    return indexes;
  },

  "parseChooseCommand": (message) => {
    const words = _.words(message.content);
    const pickAt = internals.getHotWordIndexes(words, ["pick"]);
    if(_.isEmpty(pickAt)) {
      return {
        "selectionCount": 0
      };
    }

    let selection = 0;
    _.forEach(pickAt, (pickAtIndex) => {
      if(!selection
      && (pickAtIndex < words.length)) {
        // This isn't the last word in the message
        const number = internals.wordToNumber(words[pickAtIndex + 1]);
        if(number > 0) {
          selection = internals.wordToNumber(words[pickAtIndex + 1]);
        }
      }
    });

    const choices = [];
    const split = message.content.split(",");
    _.forEach(split, (csv, i) => {
      csv = csv.trim();
      if(!csv) {
        return;
      }

      if(csv.substr(0, 11).toLowerCase() === "magic conch") {
        csv = csv.substr(11).trim();
      }

      if(csv.substr(0, 4) === "pick") {
        csv = _.tail(_.compact(csv.substr(4).split(" "))).join(" ");
      }

      if(csv.trim()) {
        choices.push(csv.trim());
      }
    });

    return {
      "choices": choices,
      "selectionCount": selection
    };
  }
};

module.exports = commandObject = {

  "name": "Pick one",
  "command": "Magic Conch pick <number>: <choice>[, <choice>...]",
  "admin": false,
  "visible": true,
  "description": "Ask the conch to pick from a list. It supports any number up to 10 and the list should be comma separated. For example, \
    \"Magic Conch, pick two: good, bad, ugly\".",
  "trigger": {
    "on": "message",
    "filter": (message) => {
      if(message.content.substr(0, 11).toLowerCase() !== "magic conch") {
        return false;
      }

      const parsedChooseCommand = internals.parseChooseCommand(message);
      return ((parsedChooseCommand.selectionCount > 0)
           && (parsedChooseCommand.choices.length > 0));
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
    const parsedChooseCommand = internals.parseChooseCommand(message);
    if((parsedChooseCommand.selectionCount >= parsedChooseCommand.choices.length)
    || (parsedChooseCommand.selectionCount >= _.uniq(parsedChooseCommand.choices).length)) {
      return util.sendMessage(message.channel, {
        "embed": {
          "color": 11699390,
          "title": "The magic conch says...",
          "description": "...really?"
        }
      }, true);
    }

    let picks = [];
    let i;
    for(i = 0; i < parsedChooseCommand.selectionCount; i++) {
      const pick = _.sample(parsedChooseCommand.choices);
      picks.push(pick);
      parsedChooseCommand.choices = _.without(parsedChooseCommand, pick);
    }

    return util.sendMessage(message.channel, {
      "embed": {
        "color": 11699390,
        "title": "The magic conch says...",
        "description": picks.join(", ")
      }
    }, true);
  }
};
