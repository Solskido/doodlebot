const _ = require("lodash");
const log = require("../../lib/log.js");
const util = require("../../lib/util.js");
const db = require("../../lib/db.js");

const internals = {};

module.exports = commandObject = {

  "name": "Battle royale add map",
  "command": "!braddgame <game> <map>",
  "admin": false,
  "visible": true,
  "description": "Battle royale - add a new map. Spaces are allowed.",
  "trigger": {
    "on": "message",
    "filter": (message) => {
      return (message.content.substr(0, 9).toLowerCase() === "!braddmap");
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
    const words = _.without(_.words(message.content), "braddmap");
    if(words.length < 2) {
      // The minimum requirement is (the command trigger), plus the game name, plus the map name
      return message.react("❌");
    }

    let inputPossibilities = [];
    if(words.length) {
      inputPossibilities = util.permutateWords(words, true);
    }

    return db.brgames.find({
      "gameSearchable": {
        "$in": _.invokeMap(inputPossibilities, String.prototype.toLowerCase)
      }
    })
    .then((existingGames) => {
      if(_.isEmpty(existingGames)) {
        return util.sendMessage(message.channel, "You'll need to create that game first with !braddgame <game>", true);
      }
      else if(existingGames.length > 1) {
        return util.sendMessage(message.channel, `I can't tell which of these games you're referring to: ${_.map(existingGames, "game").join(", ")}.`, true);
      }

      const gameNameRegex = util.sanitizedRegex(existingGames[0].game, "gi");
      const newMapName = _.replace(words.join(" "), gameNameRegex, "").trim();
      if(newMapName.toLowerCase() === "<map>") {
        message.react("❌");
        return util.sendMessage(message.channel, "That was just an example command. Type something cool instead of <map>.", true);
      }
      else if(newMapName.toLowerCase() === "something cool") {
        message.react("💢");
        return util.sendMessage(message.channel, "Alright listen here you little shit.", true);
      }

      return db.brmaps.findOne({
        "gameSearchable": existingGames[0].gameSearchable,
        "mapSearchable": newMapName.toLowerCase()
      })
      .then((existingMap) => {
        if(existingMap) {
          return message.react("❌");
        }

        return db.brmaps.create({
          "game": existingGames[0].game,
          "gameSearchable": existingGames[0].gameSearchable,
          "map": newMapName,
          "mapSearchable": newMapName.toLowerCase()
        })
        .then(() => {
          return message.react("✅");;
        });
      });
    })
    .catch((err) => {
      log(err);
      message.react("❌");
    });
  }
};
