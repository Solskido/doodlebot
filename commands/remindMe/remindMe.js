const _ = require("lodash");
const log = require("../../lib/log.js");
const db = require("../../lib/db.js");
const util = require("../../lib/util.js");

const internals = {

  "extractRemindWhoFrom": (message, outOfContext) => {
    let who = "";
    let fragment = message.content;

    if(!outOfContext) {
      fragment = util.grabParamAfter(message, "remind")[0];
    }

    who = internals.extractRemindWhoFromFragment(fragment, message);

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
  },

  "extractRemindWhoFromFragment": (string, message) => {
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
  },

  "extractRemindWhatFrom": (string, phrases) => {
    let remindWhat = string;

    _.forEach(phrases, (phrase) => {
      remindWhat = util.extractPhraseFromString(remindWhat, phrase)
    });

    return remindWhat.trim();
  },

  "executeRemindMeCommand": (message, whenMessage, whoMessage, whatMessage) => {
    // When
    let when = new Date();
    let dateTimeResult;
    if(whenMessage) {
      dateTimeResult = util.extractDatetimeFrom(whenMessage.content);
    }
    else {
      dateTimeResult = util.extractDatetimeFrom(message.content);
    }

    if(!dateTimeResult.isDatetime) {
      if(!whenMessage) {
        return util.promptFor(message, `When should I remind you <@${message.author.id}>?`)
        .then((message2) => {
          internals.executeRemindMeCommand(message, message2, whoMessage, whatMessage);
        })
        .catch(log);
      }
      else {
        util.sendMessage(message.channel, `<@${message.author.id}>, I have no idea when that is.`, true);
        return;
      }
    }
    else {
      const now = new Date();
      if(now.getTime() > new Date(dateTimeResult.when).getTime()) {
        util.sendMessage(message.channel, `<@${message.author.id}> that's in the past.`, true);
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
        util.sendMessage(message.channel, `I won't use that @ tag.`);
        return;
      }

      if(!whoMessage) {
        return util.promptFor(message, `Who should I remind <@${message.author.id}>?`)
        .then((message2) => {
          internals.executeRemindMeCommand(message, whenMessage, message2, whatMessage);
        })
        .catch(log);
      }
      else {
        util.sendMessage(message.channel, `<@${message.author.id}>, I have no idea who that is.`, true);
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
        `<@${internals.doodlebot.client.user.id}>`
      ]);
    }
    else {
      what = internals.extractRemindWhatFrom(message.content, [
        whoResult.extract,
        dateTimeResult.extract,
        "remind",
        "doodlebob",
        `<@${internals.doodlebot.client.user.id}>`
      ]);
    }

    if(!what) {
      if(!whatMessage) {
        return util.promptFor(message, `What should I remind about <@${message.author.id}>?`)
        .then((message2) => {
          internals.executeRemindMeCommand(message, whenMessage, whoMessage, message2);
        })
        .catch(log);
      }
      else {
        util.sendMessage(message.channel, `<@${message.author.id}>, I don't know what to remind about.`, true)
        return;
      }
    }

    log("Got what: ", typeof what, what);

    log("Done parsing remind command.");

    const reminder = {
      "who": who,
      "what": what,
      "when": new Date(when.toString())
    };

    if(!util.isDM(message)) {
      reminder.channel = message.channel.id;
    }

    return db.reminders.create(reminder)
    .then(() => {
      internals.doodlebot.client.setTimeout((reminder) => {
        internals.doodlebot.executeManual("Send reminder", reminder);
      }, util.msBetween(when), reminder);

      util.sendMessage(message.channel, `I'll remind <@${who}> ${what} ${new Date(when.toString()).toLocaleString()}`, true);
    })
    .catch((err) => {
      log(err);
      message.react("❌");
    });
  }
};

module.exports = commandObject = {

  "name": "Request reminder",
  "command": "Doodlebob, remind <me/@someone> <something> <on/at> <date/time>",
  "admin": false,
  "visible": true,
  "description": "Ask me to remind you or someone else something at a later date. If your message includes multiple phrases I might \
interpret as a date, I will use the first one I find as the date to remind you. You can also say things like \"in 5 minutes\" or \"\
on Friday\". **This works in DMs!**",
  "trigger": {
    "on": "message",
    "filter": (message) => {
      if(!util.isTalkingAboutMe(message)
      && !util.isTalkingToMe(message)) {
        return false;
      }

      const words = _.words(message.content);
      if(_.includes(words, "remind")) {
        return true;
      }

      return false;
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
    return internals.executeRemindMeCommand(message);
  }
};
