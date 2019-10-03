let GLOBAL_ADMIN;
try {
  const auth = require("../auth.json");
  GLOBAL_ADMIN = auth.GLOBAL_ADMIN;
}
catch(e) {
  GLOBAL_ADMIN = process.env.GLOBAL_ADMIN;
}

const _ = require("lodash");
const log = require("./log.js");
const chrono = require("chrono-node");

const SPAM_INTERVAL = 1000;
let lastChatted = 0;

const internals = {};

module.exports = util = {

  "init": (doodlebot) => {
    if(!doodlebot) {
      throw new Error("Fatal error attempting to set the bot instance to null.");
    }

    internals.doodlebot = doodlebot;
  },

  "sendMessage": (channel, message, always) => {
    if(!channel
    || !message) {
      throw new Error("sendMessage requires a channel and a message.");
    }

    if(!always) {
      if(util.imSpamming()) {
        return Promise.reject(new Error("Spamming"));
      }
    }

    return channel.send(message)
    .then(() => {
      util.messageWasSent();
    });
  },

  "messageWasSent": () => {
    lastChatted = new Date().getTime();
  },

  "imSpamming": () => {
    const now = new Date().getTime();
    if(!lastChatted
    || ((now - lastChatted) >= SPAM_INTERVAL)) {
      return false;
    }

    log("I'm spamming.");
    return true;
  },

  "isTalkingToMe": (message) => {
    if(!message) {
      return false;
    }

   const words = _.words(message.content);

    if(!words.length) {
      return false;
    }

    return util.isMe(words[0]);
  },

  "isTalkingAboutMe": (message) => {
    if(!message) {
      return false;
    }

   if(message.isMentioned(internals.doodlebot.client.user)) {
      return true;
    }

    const words = _.words(message.content);

    if(!words.length) {
      return false;
    }

    return _.some(words, (word) => {
      return util.isMe(word);
    });
  },

  "isMe": (string) => {
    if(!string
    || !_.isString(string)) {
      return false;
    }

    if(string === internals.doodlebot.client.user.id) {
      return true;
    }

    return (string.toLowerCase() === "doodlebob");
  },

  "DOUBLE_SPACE": / +/g,
  "extractPhraseFromString": (string, phrase) => {
    if(!string
    || !_.isString(string)
    || !phrase
    || !_.isString(phrase)) {
      throw new Error("extractPhraseFromString requires two strings, a search space and a phrase.");
    }

    let newString = string.replace(new RegExp(`([\\n ]${_.escapeRegExp(phrase)}|^${_.escapeRegExp(phrase)})`, "i"), " ");
    newString = newString.replace(util.DOUBLE_SPACE, " ");

    return newString;
  },

  "promptFor": (message, prompt) => {
    if(!message
    || !prompt) {
      throw new Error("promptFor requires a source message and a prompt message.");
    }

    return new Promise((resolve, reject) => {
      util.sendMessage(message.channel, prompt, true)
      .then(() => {

        message.channel.awaitMessages((m) => {
          return (message.author.id === m.author.id);
        }, {
          "time": 60000,
          "maxMatches": 1,
          "errors": ["time"]
        })
        .then((messages) => {
          return resolve(messages.first());
        })
        .catch(() => {
          util.sendMessage(message.channel, `Alright forget it <@${message.author.id}>.`);
          return reject();
        });
      });
    });
  },

  "grabParamAfter": (message, trigger, hotWords) => {
    if(!message
    || !trigger
    || !_.isString(trigger)) {
      throw new Error("grabParamAfter requires a source message and a trigger word.");
    }

    if(!hotWords) {
      hotWords = [];
    }

    const words = _.words(message.content);
    let consuming = false;

    let i;
    let param = [];
    for(i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();
      if(consuming) {
        if(_.includes(hotWords, word)) {
          consuming = false;
        }
        else {
          param.push(word);
        }
      }
      else if(word.toLowerCase() === trigger) {
        consuming = true;
      }
    }

    log("grabParamAfter", trigger, param);
    return param;
  },


  "extractDatetimeFrom": (message) => {
    if(!message) {
      throw new Error("extractDatetimeFrom requires a source message.");
    }

    const parsedDate = chrono.parse(message);
    const result = {
      "isDatetime": (parsedDate.length > 0)
    };

    if(parsedDate.length > 0) {
      result.when = parsedDate[0].start.date();
      result.extract = parsedDate[0].text;
    }

    return result;
  },

  "msBetween": (a, b) => {
    if(!a
    || !_.isDate(a)) {
      throw new Error("msBetween requires a starting date.");
    }

    if(!b) {
      b = new Date();
    }

    return Math.abs(a.getTime() - b.getTime());
  },

  "chance": (percent) => {
    return ((Math.random() * 100) <= (percent || 0));
  },

  "random": (floor, ceiling) => {
    return Math.floor((Math.random() * (((ceiling || 0) - (floor || 0)) + 1)) + (floor || 0));
  },

  "capitalize": (string) => {
    if(!string
    || !_.isString(string)) {
      return "";
    }

    return `${string.substr(0, 1).toUpperCase()}${string.substr(1)}`;
  },

  "isBotAdmin": (member) => {
    if(!member) {
      throw new Error("isBotAdmin requires a member to inspect ( ͡° ͜ʖ ͡°).");
    }

    const rolesNames = _.map(member.roles.array(), (role) => {
      return role.name.toLowerCase();
    });

    if(_.includes(rolesNames, "bot admin")) {
      return true;
    }

    return false;
  },

  "permutateWords": (words, preserveCase) => {
    let wordList = [];

    if(_.isString(words)) {
      wordList = _.words(words);
    }
    else if(_.isArray(words)) {
      wordList = words;
    }
    else {
      return [];
    }

    const permutated = [];
    if(words.length === 1) {
      if(_.isString(words[0])) {
        if(preserveCase) {
          permutated.push(words[0]);
        }
        else {
          permutated.push(words[0].toLowerCase());
        }
      }
    }
    else {
      let i;
      for(i = 0; i < words.length; i++) {
        if(!_.isString(words[i])) {
          continue;
        }

        let comboWord;
        if(preserveCase) {
          comboWord = words[i];
        }
        else {
          comboWord = words[i].toLowerCase();
        }

        permutated.push(comboWord);

        let j;
        for(j = (i + 1); j < words.length; j++) {
          if(!_.isString(words[j])) {
            continue;
          }

          if(preserveCase) {
            comboWord += ` ${words[j]}`;
          }
          else {
            comboWord += ` ${words[j].toLowerCase()}`;
          }

          permutated.push(comboWord);
        }
      }
    }

    return _.uniq(permutated);
  },

  "ALLOWED_IN_USER_REGEX": /[^A-Za-z0-9' ]/g,
  "sanitizedRegex": (string, flags) => {
    if(!string
    || !_.isString(string)) {
      throw new Error("sanitizedRegex requires a string to convert into a regular expression.");
    }

    return new RegExp(_.replace(string, util.ALLOWED_IN_USER_REGEX, ""), ((_.isString(flags) && !_.isEmpty(flags)) ? flags : undefined));
  },

  "isDM": (message) => {
    if(!message) {
      throw new Error("isDM requires a message to evaluate.");
    }

    return (message.channel.type === "dm");
  },

  "isFromGlobalAdmin": (message) => {
    if(!message) {
      throw new Error("isFromGlobalAdmin requires a message to evaluate.");
    }

    if(!GLOBAL_ADMIN) {
      return false;
    }

    let user;
    if(util.isDM(message)) {
      user = message.author;
    }
    else {
      user = message.member;
    }

    return (GLOBAL_ADMIN === `${user.username}#${user.discriminator}`);
  },

  "messageIsFromAnyAdmin": (message) => {
    return (util.isDM(message) ? util.isFromGlobalAdmin(message) : util.isBotAdmin(message.member));
  }
};
