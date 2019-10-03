const _ = require("lodash");
const log = require("../../lib/log.js");
const util = require("../../lib/util.js");
const db = require("../../lib/db.js");

const internals = {};

module.exports = commandObject = {

  "name": "Battle royale add game",
  "command": "!braddgame <game>",
  "admin": false,
  "visible": true,
  "description": "Battle royale - add a new game. Spaces are allowed.",
  "trigger": {
    "on": "message",
    "filter": (message) => {
      return (message.content.substr(0, 10).toLowerCase() === "!braddgame");
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
    const newGameName = _.without(_.words(message.content), "braddgame").join(" ");
    if(newGameName.toLowerCase() === "<game>") {
      message.react("❌");
      return util.sendMessage(message.channel, "That was just an example command. Type something cool instead of <game>.", true);
    }
    else if(newGameName.toLowerCase() === "something cool") {
      message.react("💢");
      return util.sendMessage(message.channel, "Alright listen here you little shit.", true);
    }

    return db.brgames.findOne({
      "gameSearchable": newGameName.toLowerCase()
    })
    .then((existingGame) => {
      if(existingGame) {
        return message.react("❌");
      }

      return db.brgames.create({
        "game": newGameName,
        "gameSearchable": newGameName.toLowerCase()
      })
      .then(() => {
        return message.react("✅");;
      });
    })
    .catch((err) => {
      log(err);
      message.react("❌");
    });
  }
};
