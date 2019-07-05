let token;
let IS_TEST = false;
try {
  const auth = require("./auth.json");
  token = auth.token;
  IS_TEST = auth.botTest;
}
catch(e) {
  token = process.env.token;
  IS_TEST = process.env.botTest;
}

if(!token) {
  console.log("No token. Soiled it.");
  return 0;
}

const Discord = require("discord.js");
const client = new Discord.Client();
const _ = require("lodash");
const db = require("./lib/db.js");
const log = require("./lib/log.js");
const chrono = require("chrono-node");
const getInsult = require("insults").default;

const internals = {};

const SPAM_INTERVAL = 1000;
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
const DROP_PREFIXES = [
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "We goin' to ",
  "Yo home to "
];
const DROP_SUFFIXES = [
  "",
  "",
  "",
  "",
  ", suckas.",
  ". Fuck 'em up!",
  ". Stay safe out there.",
  ". It's got the good loot.",
  " or no balls."
];

let lastChatted = 0;

client.once("ready", () => {
  console.log("Ready for action!");

  log("Setting up reminders.");

  let belated = false;
  const now = new Date();
  db.reminders.find()
  .then((allReminders) => {
    _.forEach(allReminders, (reminder) => {
      if(new Date(reminder.when).getTime() < now.getTime()) {
        internals.executeReminder(reminder);
        belated = true;
      }
      else {
        client.setTimeout(internals.executeReminder, internals.msBetween(reminder.when), reminder);
      }
    });

    if(belated) {
      internals.sendMessage(client.channels.get(allReminders[0].channel), "Sorry if these reminders are late :\\", true);
    }

    log("Finished setting up reminders.");
  })
  .catch(log);
});

client.login(token);

client.on("message", (message) => {
  if(message.author.id === client.user.id) {
    log("Message from self.");
    return;
  }

  log("Message received! " + message.content);
  const command = internals.parseCommand(message);
  if(!command.isCommand) {
    log("Not a command");
    return;
  }

  log("Executing a command");
  command.execute();
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

internals.noopCommand = {
  "isCommand": false,
  "execute": _.noop
};
internals.parseCommand = (message) => {
  log("Parsing...");

  if(internals.isChooseCommand(message)) {
    log("...is pick one command");

    return {
      "isCommand": true,
      "execute": () => {
        const parsedChooseCommand = internals.parseChooseCommand(message);
        if((parsedChooseCommand.selectionCount >= parsedChooseCommand.choices.length)
        || (parsedChooseCommand.selectionCount >= _.uniq(parsedChooseCommand.choices).length)) {
          return internals.sendConchMessage(message.channel, "...really?", true);
        }

        let picks = [];
        let i;
        for(i = 0; i < parsedChooseCommand.selectionCount; i++) {
          const pick = _.sample(parsedChooseCommand.choices);
          picks.push(pick);
          parsedChooseCommand.choices = _.without(parsedChooseCommand, pick);
        }

        return internals.sendConchMessage(message.channel, picks.join(", "), true);
      }
    };
  }
  else if(internals.isDropCommand(message)) {
    log("...is drop command");

    return {
      "isCommand": true,
      "execute": () => {
        const words = _.words(message.content);
        db.dropzones.distinct("map")
        .then((allMaps) => {
          log(allMaps);

          log(`Got all maps: ${allMaps.join(", ")}`);

          const mapChoice = _.intersection(allMaps, words);
          if(!mapChoice.length) {
            return internals.sendMessage(message.channel, `I only know about these maps (these are case sensitive): ${allMaps.join(", ")}.`, true);
          }
          else if(mapChoice.length > 1) {
            return internals.sendMessage(message.channel, "...what?", true);
          }

          return db.dropzones.find({
            "map": mapChoice[0]
          })
          .then((allZones) => {
            if(_.isEmpty(allZones)) {
              return internals.sendMessage(message.channel, "I don't know any zones in this map yet. Try: !braddzone <game> <map> <zone>", true);
            }

            return internals.sendMessage(message.channel, `${_.sample(DROP_PREFIXES)}${_.sample(allZones).zone}${_.sample(DROP_SUFFIXES)}`, true);
          });
        })
        .catch(log);
      }
    }
  }
  else if(internals.isDropControlCommand(message)) {
    log("...is drop control command");

    return {
      "isCommand": true,
      "execute": () => {
        const splitMessage = message.content.split(" ");
        log(`Split message: ${splitMessage.join(", ")}`);

        switch(splitMessage[0]) {
          case "!brwhatis":
            log("Is what is command.");

            const query = {};
            switch(splitMessage.length) {
              case 1:
                break;
              case 2:
                query.$or = [
                  {
                    "game": splitMessage[1]
                  },
                  {
                    "map": splitMessage[1]
                  }
                ];
                break;
              default:
                return internals.sendMessage(message.channel, "Try: !brwhatis <game/map>");
            }

            log(query);
            return db.dropzones.find(query)
            .then((allZones) => {
              log(JSON.stringify(allZones, null, 2));
              if(_.isEmpty(allZones)) {
                return internals.sendMessage(message.channel, "There are no Battle Royale dropzones yet. Try: !braddzone <game> <map> <zone>");
              }

              fields = [];
              const games = _.uniq(_.map(allZones, "game"));
              _.forEach(games, (game) => {
                const gameZones = _.filter(allZones, {
                  "game": game
                });

                const maps = _.uniq(_.map(gameZones, "map"));

                let output = "";
                _.forEach(maps, (map) => {
                  const mapZones = _.filter(gameZones, { "map": map });
                  output += `${map}: ${_.map(mapZones, "zone").join(", ")}\n`;
                });

                fields.push({
                  "name": game,
                  "value": output
                });
              });

              return internals.sendMessage(message.channel, {
                "embed": {
                  "color": 3447003,
                  "title": "Battle Royale zone search results",
                  "fields": fields
                }
              }, true);
            })
            .catch(log);

          case "!braddzone":
            log("Is add zone command.");

            if(splitMessage.length !== 4) {
              return internals.sendMessage(message.channel, "Try: !braddzone <game> <map> <zone>", true);
            }

            const newZone = {
              "game": splitMessage[1],
              "map": splitMessage[2],
              "zone": splitMessage[3]
            };

            return db.dropzones.find(newZone)
            .then((existingZone) => {
              log(existingZone);

              if(_.isEmpty(existingZone)) {
                return db.dropzones.create(newZone)
                .then(() => {
                  message.react("✅");
                });
              }

              return internals.sendMessage(message.channel, "That zone already exists.", true);
            })
            .catch(log);

          case "!brremovezone":
            log("Is remove zone command.");

            if(splitMessage.length !== 4) {
              return internals.sendMessage(message.channel, "Try: !brremovezone <game> <map> <zone>", true);
            }

            return db.dropzones.destroy({
              "game": splitMessage[1],
              "map": splitMessage[2],
              "zone": splitMessage[3]
            })
            .then(() => {
              message.react("✅");
            })
            .catch(log);

          case "!brremovegame":
            log("Is remove game command.");

            if(!internals.isBotAdmin(message.member)) {
              return internals.sendMessage(message.channel, "Woah there partner, that's a dangerous command. Only admins get to do that.", true);
            }

            if(splitMessage.length !== 2) {
              return internals.sendMessage(message.channel, "Try: !brremovegame <game>", true);
            }

            return db.dropzones.destroy({
              "game": splitMessage[1]
            })
            .then(() => {
              message.react("✅");
            })
            .catch(log);

          case "!brremovemap":
            log("Is remove map command.");

            if(!internals.isBotAdmin(message.member)) {
              return internals.sendMessage(message.channel, "Woah there partner, that's a dangerous command. Only admins get to do that.", true);
            }

            if(splitMessage.length !== 3) {
              return internals.sendMessage(message.channel, "Try: !brremovemap <game> <map>", true);
            }

            return db.dropzones.destroy({
              "game": splitMessage[1],
              "map": splitMessage[2]
            })
            .then(() => {
              message.react("✅");
            })
            .catch(log);

          default:
            log(`Unknown drop control command: ${message.content}.`);
            break;
        }
      }
    };
  }
  else if(internals.isConchCommand(message)) {
    log("...is conch command");

    return {
      "isCommand": true,
      "execute": () => {
        internals.sendConchMessage(message.channel, _.sample(CONCH), true);
      }
    };
  }
  else if(internals.isCommandsCommand(message)) {
    log("...is commands command");

    return {
      "isCommand": true,
      "execute": () => {
        internals.sendMessage(message.channel, {
          "embed": {
            "color": 3447003,
            "title": "What can Doodlebob do?",
            //"description": "This is a test embed to showcase what they look like and what they can do.",
            "fields": [
              {
                "name": "!commands",
                "value": "This one you already know about."
              },
              {
                "name": "Magic Conch, <question>?",
                "value": "Ask the conch a yes or no question."
              },
              {
                "name": "Magic Conch pick <number>: <choice>, <choice>, <choice>",
                "value": "Ask the conch to pick from a list. It supports any number up to 10 and the list should be comma separated."
              },
              {
                "name": "Doodlebob, remind <@someone/me> <something> <date>",
                "value": "Ask me to remind you or someone else something at a later date. If your message includes multiple phrases I might interpret as a date, I will use the first one I find as the date to remind you. You can also say things like \"in 5 minutes\" or \"on Friday\"."
              },
              {
                "name": "!insultme",
                "value": "I fling a real zinger at you."
              }
            ],
            "timestamp": new Date(),
            "footer": {
              "icon_url": client.user.avatarURL,
              "text": "© solskido"
            }
          }
        }, true);
      }
    };
  }
  else if(internals.isInsultCommand(message)) {
    log("...is insult command");

    return {
      "isCommand": true,
      "execute": () => {
        internals.sendMessage(message.channel, getInsult(), true);
      }
    };
  }
  else if(internals.isRemindMeDebugCommand(message)) {
    log("...is remind me debug command");

    const isBotAdmin = internals.isBotAdmin(message.member);
    log(isBotAdmin);

    if(!isBotAdmin) {
      log("Is not admin.");
      return internals.noopCommand;
    }

    log("Is admin.");
    return {
      "isCommand": true,
      "execute": () => {
        log("Executing remind me debug command.");
        db.reminders.find({})
        .then((reminders) => {
          internals.sendMessage(message.author, JSON.stringify(reminders, null, 2), true);
          internals.sendMessage(message.channel, "DM sent.", true);
        })
        .catch((err) => {
          log(err);
        });
      }
    };
  }
  else if(internals.isRemindMeCommand(message)) {
    log("...is remind me command");

    return {
      "isCommand": true,
      "execute": () => {
        internals.executeRemindMeCommand(message);
      }
    };
  }
  else if(internals.isTalkingToMe(message)
  || internals.isTalkingAboutMe(message)) {
    log("...is talking to or about me");

    return {
      "isCommand": true,
      "execute": () => {
        internals.executeGibberishCommand(message.channel);
      }
    };
  }

  log("Not a relevant message.");

  return internals.noopCommand;
};

internals.isBotAdmin = (member) => {
  log(`Checking if member is bot admin... ${member.user.username}.`)

  const rolesNames = _.map(member.roles.array(), (role) => {
    return role.name.toLowerCase();
  });

  if(_.includes(rolesNames, "bot admin")) {
    log("Is admin.");
    return true;
  }

  log(`A non-admin user (${member.user.username}#${member.user.discriminator}) attempted an admin bot command.`);
  return false;
}

internals.chance = (percent) => {
  return ((Math.random() * 100) <= percent);
};

internals.random = (floor, ceiling) => {
  return Math.floor((Math.random() * ((ceiling - floor) + 1)) + floor);
};

internals.capitalize = (string) => {
  return `${string.substr(0, 1).toUpperCase()}${string.substr(1)}`;
};

internals.generateGibberish = (a, b) => {
  const words = [];
  let i;
  for(i = internals.random(a, b); i > 0; i--) {
    words.push(_.sample(GIBBERISH));
  }

  let gibberish = "";
  _.forEach(words, (word, index) => {
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

internals.sendMessage = (channel, message, always) => {
  if(!always) {
    if(internals.imSpamming()) {
      return Promise.reject(new Error("Spamming"));
    }
  }

  return channel.send(message)
  .then(() => {
    internals.messageWasSent();
  });
};

internals.sendConchMessage = (channel, content, always) => {
  return internals.sendMessage(channel, {
    "embed": {
      "color": 11699390,
      "title": "The magic conch says...",
      "description": content
    }
  }, always);
};

internals.messageWasSent = () => {
  lastChatted = new Date().getTime();
};

internals.imSpamming = () => {
  const now = new Date().getTime();
  if(!lastChatted
  || ((now - lastChatted) >= SPAM_INTERVAL)) {
    log("I'm not spamming");
    return false;
  }

  log("I'm spamming");
  return true;
};

internals.executeGibberishCommand = (channel) => {
  internals.sendMessage(channel, internals.generateGibberish(1, 6));
};

internals.isRemindMeDebugCommand = (message) => {
  return (message.content === "!allreminders");
};

internals.isCommandsCommand = (message) => {
  return (message.content === "!commands");
};

internals.isInsultCommand = (message) => {
  return (message.content === "!insultme");
};

internals.isRemindMeCommand = (message) => {
  if(!internals.isTalkingAboutMe(message)
  && !internals.isTalkingToMe(message)) {
    return false;
  }

  const words = _.words(message.content);
  if(_.includes(words, "remind")) {
    return true;
  }

  return false;
};

internals.executeRemindMeCommand = (message, whenMessage, whoMessage, whatMessage) => {

  // When
  let when = new Date();
  let dateTimeResult;
  if(whenMessage) {
    dateTimeResult = internals.extractDatetimeFrom(whenMessage.content);
  }
  else {
    dateTimeResult = internals.extractDatetimeFrom(message.content);
  }

  if(!dateTimeResult.isDatetime) {
    if(!whenMessage) {
      return internals.promptFor(message, `When should I remind you <@${message.author.id}>?`)
      .then((message2) => {
        internals.executeRemindMeCommand(message, message2, whoMessage, whatMessage);
      })
      .catch(log);
    }
    else {
      internals.sendMessage(message.channel, `<@${message.author.id}>, I have no idea when that is.`, true);
      return;
    }
  }
  else {
    const now = new Date();
    if(now.getTime() > new Date(dateTimeResult.when).getTime()) {
      internals.sendMessage(message.channel, `<@${message.author.id}> that's in the past.`, true);
      return;
    }
  }

  when = dateTimeResult.when;
  log("Got when: ", typeof when, when);

  // Who
  let who = message.author.id;
  let whoResult;
  if(whoMessage) {
    whoResult = internals.extractRemindWhoFrom(whoMessage, true);
  }
  else {
    whoResult = internals.extractRemindWhoFrom(message, false);
  }

  if(!whoResult.isWho) {
    if(whoResult.triedAll) {
      internals.sendMessage(message.channel, `I won't use that @ tag.`);
      return;
    }

    if(!whoMessage) {
      return internals.promptFor(message, `Who should I remind <@${message.author.id}>?`)
      .then((message2) => {
        internals.executeRemindMeCommand(message, whenMessage, message2, whatMessage);
      })
      .catch(log);
    }
    else {
      internals.sendMessage(message.channel, `<@${message.author.id}>, I have no idea who that is.`, true);
      return;
    }
  }

  who = whoResult.who;
  log("Got who: ", typeof who, who);

  // What
  let what = message.content;
  if(whatMessage) {
    what = internals.extractRemindWhatFrom(whatMessage.content, [
      whoResult.extract,
      dateTimeResult.extract,
      "remind",
      "doodlebob",
      `<@${client.user.id}>`
    ]);
  }
  else {
    what = internals.extractRemindWhatFrom(message.content, [
      whoResult.extract,
      dateTimeResult.extract,
      "remind",
      "doodlebob",
      `<@${client.user.id}>`
    ]);
  }

  if(!what) {
    if(!whatMessage) {
      return internals.promptFor(message, `What should I remind about <@${message.author.id}>?`)
      .then((message2) => {
        internals.executeRemindMeCommand(message, whenMessage, whoMessage, message2);
      })
      .catch(log);
    }
    else {
      internals.sendMessage(message.channel, `<@${message.author.id}>, I don't know what to remind about.`, true)
      return;
    }
  }

  log("Got what: ", typeof what, what);

  log("Done parsing remind command.");
  const reminder = {
    "channel": message.channel.id,
    "who": who,
    "what": what,
    "when": new Date(when.toString())
  };

  db.reminders.create(reminder)
  .then(() => {
    client.setTimeout(internals.executeReminder, internals.msBetween(when), reminder);
    internals.sendMessage(message.channel, `I'll remind <@${who}> ${what} ${new Date(when.toString()).toLocaleString()}`, true);
  })
  .catch((err) => {
    log(err);
    internals.sendMessage(message.channel, "Something went horribly wrong trying to save this reminder. Soiled it.");
  });
};

internals.executeReminder = (reminder) => {
  internals.sendMessage(client.channels.get(reminder.channel), `<@${reminder.who}>, reminder ${reminder.what}`, true);
  db.reminders.destroy(reminder);
};

internals.msBetween = (a, b) => {
  if(!b) {
    b = new Date();
  }

  return Math.abs(a.getTime() - b.getTime());
};

internals.extractRemindWhoFrom = (message, outOfContext) => {
  let who = "";
  let fragment = message.content;

  if(!outOfContext) {
    fragment = internals.grabParamAfter(message, "remind")[0];
  }

  who = internals.extractRemindWhoFromFragment(fragment, message);

  log(`>>${who}<<`);
  switch(who) {
    case "me":
      return {
        "isWho": true,
        "who": message.author.id,
        "extract": "me"
      };
    case "everyone":
    case "@everyone":
      log("Caught all tag use.");
      return {
        "isWho": false,
        "triedAll": true
      };
    case "here":
    case "@here":
      log("Caught all tag use.");
      return {
        "isWho": false,
        "triedAll": true
      };
    default:
      if(who) {
        return {
          "isWho": true,
          "who": who,
          "extract": `<@${who}>`
        };
      }

      return {
        "isWho": false
      };
  }
};

internals.isDropCommand = (message) => {
  if(!internals.isTalkingToMe(message)) {
    return false;
  }

  const words = _.invokeMap(_.words(message), String.prototype.toLowerCase);
  if(_.includes(words, "where")
  && (_.includes(words, "drop")
    || _.includes(words, "droppin")
    || _.includes(words, "dropping"))
  ) {
    return true;
  }

  return false;
};

internals.isDropControlCommand = (message) => {
  log(`Checking isDropControlCommand: ${message}`)

  return _.includes([
    "!brwhatis",
    "!braddzone",
    "!brremovezone",
    "!brremovemap",
    "!brremovegame"
  ], message.content.split(" ")[0]);
};

internals.extractRemindWhoFromFragment = (string, message) => {
  log("extractRemindWhoFromFragment", string);

  if(string.trim().toLowerCase() === "me") {
    return "me";
  }

  if(string.trim().toLowerCase() === "everyone") {
    return "everyone";
  }

  if(string.trim().toLowerCase() === "here") {
    return "here";
  }

  if(message.mentions.length) {
    return message.mentions.first().id;
  }

  return string.trim();
};

internals.extractRemindWhatFrom = (string, phrases) => {
  // log("extractRemindWhatFrom", string, phrases);

  let remindWhat = string;

  _.forEach(phrases, (phrase) => {
    remindWhat = internals.extractPhraseFromString(remindWhat, phrase)
  });

  // log("extractRemindWhatFrom AFTER", remindWhat)
  return remindWhat.trim();
};

internals.DOUBLE_SPACE = / +/g;
internals.extractPhraseFromString = (string, phrase) => {
  // log("extractPhraseFromString", `>${string}<`, `>${phrase}<`);

  let newString = string.replace(new RegExp(`([\\n ]${_.escapeRegExp(phrase)}|^${_.escapeRegExp(phrase)})`, "i"), " ");
  newString = newString.replace(internals.DOUBLE_SPACE, " ");

  // log("extractPhraseFromString AFTER", newString);
  return newString;
};

internals.promptFor = (message, prompt) => {
  return new Promise((resolve, reject) => {
    internals.sendMessage(message.channel, prompt, true)
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
        internals.sendMessage(message.channel, `Alright forget it <@${message.author.id}>.`);
        return reject();
      });
    });
  });
};

internals.grabParamAfter = (message, trigger, hotWords) => {
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
};

internals.extractDatetimeFrom = (message) => {
  const parsedDate = chrono.parse(message);
  const result = {
    "isDatetime": (parsedDate.length > 0)
  };

  if(parsedDate.length > 0) {
    result.when = parsedDate[0].start.date();
    result.extract = parsedDate[0].text;
  }

  return result;
};
