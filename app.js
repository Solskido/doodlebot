const Discord = require("discord.js");
const client = new Discord.Client();
const _ = require("lodash");

const internals = {};

const token = require("./auth.json").token;

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
  if(internals.isTalkingToMe(message)
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
  return Math.floor((Math.random() * (ceiling - floor)) + floor);
};

internals.capitalize = (string) => {
  return `${string.substr(0, 1).toUpperCase()}${string.substr(1)}`;
};

internals.generateGibberish = () => {
  const wordCount = internals.random(1, 6);
  const words = [];
  let i;
  for(i = 0; i < wordCount; i++) {
    const index = internals.random(0, (GIBBERISH.length - 1));
    //console.log(index);
    //console.log(GIBBERISH[index]);

    words.push(GIBBERISH[index]);
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

