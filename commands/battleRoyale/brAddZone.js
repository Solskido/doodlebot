const _ = require("lodash");
const log = require("../../lib/log.js");
const util = require("../../lib/util.js");
const db = require("../../lib/db.js");

const internals = {};

module.exports = commandObject = {

  "name": "Battle royale add zone",
  "command": "!braddzone <game> <map> <zone>",
  "admin": false,
  "visible": true,
  "description": "Battle royale - add a new dropzone. Spaces are allowed.",
  "trigger": {
    "on": "message",
    "filter": (message) => {
      return (message.content.substr(0, 10).toLowerCase() === "!braddzone");
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
    const words = _.without(_.words(message.content), "braddzone");
    if(words.length < 3) {
      // The minimum requirement is (the command trigger), plus the game name, plus the map name, plus the zone name
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
      let mapAndZoneString = _.replace(message.content, "!braddzone", "").trim();
      mapAndZoneString = _.replace(mapAndZoneString, gameNameRegex, "").trim();

      const remainingInputPossibilities = util.permutateWords(_.words(mapAndZoneString), true);

      return db.brmaps.find({
        "gameSearchable": existingGames[0].gameSearchable,
        "mapSearchable": {
          "$in": _.invokeMap(remainingInputPossibilities, String.prototype.toLowerCase)
        }
      })
      .then((existingMaps) => {
        if(_.isEmpty(existingMaps)) {
          return util.sendMessage(message.channel, `You'll need to create that map first with !braddmap ${existingGames[0].game} <map>`, true);
        }
        else if(existingMaps.length > 1) {
          return util.sendMessage(message.channel, `I can't tell which of these maps you're referring to: ${_.map(existingMaps, "map").join(", ")}.`, true);
        }

        const mapNameRegex = util.sanitizedRegex(existingMaps[0].map, "gi");
        const newZoneName = _.replace(mapAndZoneString, mapNameRegex, "").trim();
        if(newZoneName.toLowerCase() === "<zone>") {
          message.react("❌");
          return util.sendMessage(message.channel, "That was just an example command. Type something cool instead of <zone>.", true);
        }
        else if(newZoneName.toLowerCase() === "something cool") {
          message.react("💢");
          return util.sendMessage(message.channel, "Alright listen here you little shit.", true);
        }

        return db.brdropzones.findOne({
          "gameSearchable": existingGames[0].gameSearchable,
          "mapSearchable": existingMaps[0].mapSearchable,
          "zoneSearchable": newZoneName.toLowerCase()
        })
        .then((existingZone) => {
          if(existingZone) {
            return message.react("❌");
          }

          return db.brdropzones.create({
            "game": existingGames[0].game,
            "gameSearchable": existingGames[0].gameSearchable,
            "map": existingMaps[0].map,
            "mapSearchable": existingMaps[0].mapSearchable,
            "zone": newZoneName,
            "zoneSearchable": newZoneName.toLowerCase()
          })
          .then(() => {
            return message.react("✅");
          });
        });
      });
    })
    .catch((err) => {
      log(err);
      message.react("❌");
    });
  }
};
