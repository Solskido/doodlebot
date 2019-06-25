const Discord = require("discord.js");
const client = new Discord.Client();
const _ = require("lodash");

const internals = {};

let token;
try {
  token = require("./auth.json").token;
}
catch(e) {
  token = process.env.token;
}

if(!token) {
  console.log("Failed to start. No token. Soiled it.");
}

const SPAM_INTERVAL = 4000;
const GIBBERISH = [
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
];
const CONCH = [
  "Maybe someday.",
  "Yes.",
  "No.",
  "Nothing."
  //"Try asking again."
];

let lastChatted = 0;

client.once("ready", () => {
  console.log("Ready for action!");
});

client.login(token);

client.on("message", (message) => {
  if(message.author.id === client.user.id) {
    //console.log("Message from self.");
    return;
  }

  console.log(`Incoming message: ${message.content}`);
  if(internals.isChooseCommand(message)) {
    const parsedChooseCommand = internals.parseChooseCommand(message);
    if((parsedChooseCommand.selectionCount >= parsedChooseCommand.choices.length)
    || (parsedChooseCommand.selectionCount >= _.uniq(parsedChooseCommand.choices).length)) {
      message.channel.send({
        "embed": {
          "color": 11699390,
          "title": "The magic conch says...",
          "description": "...really?"
        }
      });

      return;
    }

    let picks = [];
    let i;
    for(i = 0; i < parsedChooseCommand.selectionCount; i++) {
      const pick = _.sample(parsedChooseCommand.choices);
      picks.push(pick);
      parsedChooseCommand.choices = _.without(parsedChooseCommand, pick);
    }

    message.channel.send({
      "embed": {
        "color": 11699390,
        "title": "The magic conch says...",
        "description": picks.join(", ")
      }
    });
  }
  else if(internals.isConchCommand(message)) {
    message.channel.send({
      "embed": {
        "color": 11699390,
        "title": "The magic conch says...",
        "description": _.sample(CONCH)
      }
    });
  }
  else if(internals.isTalkingToMe(message)
  || internals.isTalkingAboutMe(message)) {
    //console.log("Message to me.");

    const now = new Date().getTime();
    if(!lastChatted
    || ((now - lastChatted) >= SPAM_INTERVAL)) {
      //console.log("Not spamming, respond!");

      lastChatted = now;
      message.channel.send(internals.generateGibberish());
    }
    else {
      //console.log("Spem prevented.");
    }
  }
  else {
    //console.log("Message not to me.");
    return;
  }

  /*
  if(internals.isTalkingToMe(message)) {
    const command = internals.parseCommand(message);

    if(command.isCommand) {
     command.execute();
    }

    //
  }
  else if(internals.isTalkingAboutMe(message)) {
    const now = new Date().getTime();
    if(!lastChatted
    || ((now - lastChatted) >= SPAM_INTERVAL)) {
      lastChatted = now;
      message.channel.send("Bwah.");
    }
  }
  */
});

internals.isConchCommand = (message) => {
  return (message.content.substr(0, 11).toLowerCase() === "magic conch");
};

internals.isChooseCommand = (message) => {
  const parsedChooseCommand = internals.parseChooseCommand(message);
  return ((parsedChooseCommand.selectionCount > 0)
       && (parsedChooseCommand.choices.length > 0));
};

internals.parseChooseCommand = (message) => {
  if(message.content.substr(0, 11).toLowerCase() !== "magic conch") {
    return {
      "selectionCount": 0
    };
  }

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
    if(csv.substr(0, 11).toLowerCase() === "magic conch") {
      csv = csv.substr(11).trim();
    }

    if(csv.substr(0, 4) === "pick") {
      csv = _.tail(_.compact(csv.substr(4).split(" "))).join(" ");
    }

    choices.push(csv.trim());
  });

  return {
    "choices": choices,
    "selectionCount": selection
  };
};

internals.NUMBER_WORDS = [
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
];
internals.wordToNumber = (word) => {
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
};

internals.getHotWordIndexes = (words, hotWords) => {
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
};

internals.isMe = (string) => {
  if(string === client.user.id) {
    return true;
  }

  return (string.toLowerCase() === "doodlebob");
};

internals.isTalkingToMe = (message) => {
  const words = _.words(message.content);

  if(!words.length) {
    return false;
  }

  return internals.isMe(words[0]);
};

internals.isTalkingAboutMe = (message) => {
  if(message.isMentioned(client.user)) {
    return true;
  }

  const words = _.words(message.content);

  if(!words.length) {
    return false;
  }

  return _.some(words, (word) => {
    return internals.isMe(word);
  });
};

internals.parseCommand = (message) => {
  return {
    "isCommand": false,
    "execute": () => _.noop
  };
};

internals.chance = (percent) => {
  return ((Math.random() * 100) <= percent);
};

internals.random = (floor, ceiling) => {
  return Math.floor((Math.random() * ((ceiling - floor) + 1)) + floor);
};

internals.capitalize = (string) => {
  return `${string.substr(0, 1).toUpperCase()}${string.substr(1)}`;
};

internals.generateGibberish = () => {
  const words = [];
  let i;
  for(i = internals.random(1, 6); i > 0; i--) {
    words.push(_.sample(GIBBERISH));
  }

  let gibberish = "";
  _.forEach(words, (word, index) => {
    //console.log(word);

    if(index === 0) {
      gibberish += internals.capitalize(word);
    }
    else {
      if(internals.chance(10)) {
        gibberish += ", ";
      }
      else if(internals.chance(10)) {
        gibberish += ". ";
      }
      else {
        gibberish += " ";
      }

      if(gibberish.substr(-1) === ".") {
        gibberish += internals.capitalize(word);
      }
      else {
        gibberish += word;
      }
    }
  });

  gibberish = gibberish.trim();
  if(internals.chance(25)) {
    gibberish += "!";
  }
  else {
    gibberish += ".";
  }

  return gibberish;
};

