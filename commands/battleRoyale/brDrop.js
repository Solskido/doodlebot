const _ = require("lodash");
const log = require("../../lib/log.js");
const util = require("../../lib/util.js");
const db = require("../../lib/db.js");
const br = require("./lib/util.js")

const internals = {};

module.exports = commandObject = {

  "name": "Battle royale drop me",
  "command": "!drop [<game> ]<map>",
  "admin": false,
  "visible": true,
  "description": "Battle royale - receive a random drop location in the given map. If multiple games have the same map name, you'll need \
to specify the game as the first parameter. This now supports spaces and is no longer cAsE-sEnSiTiVe because you're all lazy.",
  "trigger": {
    "on": "message",
    "filter": (message) => {
      return (message.content.substr(0, 5).toLowerCase() === "!drop");
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
    const words = _.without(_.words(message.content), "drop");
    if(words.length < 1) {
      return util.sendMessage(message.channel, "You'll need to provide a map name, like \"!drop Erangel\".", true);
    }

    const inputPossibilities = util.permutateWords(words);

    db.brmaps.find()
    .then((allMaps) => {
      const mapChoice = _.filter(allMaps, (map) => {
        return _.includes(inputPossibilities, map.mapSearchable);
      });

      if(!mapChoice.length) {
        return util.sendMessage(message.channel, `I only know about these maps: ${_.map(allMaps, "map").join(", ")}.`, true);
      }
      else if(mapChoice.length > 1) {
        return message.react("❔");
      }

      return db.brdropzones.find({
        "mapSearchable": mapChoice[0].mapSearchable
      })
      .then((allZones) => {
        if(_.isEmpty(allZones)) {
          return util.sendMessage(message.channel, `I don't know any zones in this map yet. Try: !braddzone ${mapChoice[0].game} \
${mapChoice[0].map} <zone>`, true);
        }

        const uniqueGames = _.uniq(_.map(allZones, "game"));
        if(uniqueGames.length > 1) {
          const gameChoice = _.intersection(_.invokeMap(uniqueGames, String.prototype.toLowerCase), inputPossibilities);
          if(!gameChoice.length) {
            return util.sendMessage(message.channel, `That map is in multiple games: ${uniqueGames.join(", ")}.`, true);
          }
          else if(gameChoice.length > 1) {
            return message.react("❔");
          }

          allZones = _.filter(allZones, { "gameSearchable": gameChoice[0] });
        }

        return util.sendMessage(message.channel, _.sample(allZones).zone, true);
      });
    })
    .catch((err) => {
      log(err);
      message.react("❌");
    });
  }
};
