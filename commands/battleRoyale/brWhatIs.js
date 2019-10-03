const _ = require("lodash");
const Promise = require("bluebird");
const log = require("../../lib/log.js");
const util = require("../../lib/util.js");
const db = require("../../lib/db.js");
const br = require("./lib/util.js");

const internals = {};

module.exports = commandObject = {

  "name": "Battle royale what is",
  "command": "!brwhatis [<game>|<map>|<zone>]",
  "admin": false,
  "visible": true,
  "description": "Battle royale - get a list of all battle royale dropzones, organized by game and map. Optionally you can provide a \
search term. Spaces are allowed in names, and it's not case-sensitive. For example: \"!brwhatis PUBG\", or \"!brwhatis Military Base\".",
  "trigger": {
    "on": "message",
    "filter": (message) => {
      return (message.content.substr(0, 9).toLowerCase() === "!brwhatis");
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
    const words = _.without(_.words(message.content), "brwhatis");
    let inputPossibilities = [];
    if(words.length) {
      inputPossibilities = util.permutateWords(words);
    }

    const query = {};
    if(!_.isEmpty(inputPossibilities)) {
      query.$or = [
        {
          "gameSearchable": {
            "$in": inputPossibilities
          }
        },
        {
          "mapSearchable": {
            "$in": inputPossibilities
          }
        },
        {
          "zoneSearchable": {
            "$in": inputPossibilities
          }
        }
      ];
    }

    let allResults = [];
    return Promise.all([
      db.brgames.find(query),
      db.brmaps.find(query),
      db.brdropzones.find(query)
    ])
    .then((allResults) => {
      allResults = _.flatten(allResults);

      if(_.isEmpty(allResults)) {
        if(_.isEmpty(inputPossibilities)) {
          return util.sendMessage(message.channel, "There are no Battle Royale dropzones yet. Try: !braddgame <game>, !braddmap \
<game> <map>, and !braddzone <game> <map> <zone>");
        }

        return util.sendMessage(message.channel, "I couldn't find any dropzones matching that search. Try: !braddzone <game> <map> \
<zone>");
      }

      return util.sendMessage(message.channel, {
        "embed": {
          "color": 3447003,
          "title": "Battle Royale zone search results",
          "fields": br.mapZonesForEmbed(allResults)
        }
      }, true);
    })
    .catch((err) => {
      log(err);
      message.react("❌");
    });
  }
};
