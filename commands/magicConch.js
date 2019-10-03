const _ = require("lodash");
const util = require("../lib/util.js");

const internals = {
  "CONCH": [
    "Maybe someday.",
    "Yes.",
    "No.",
    "Nothing."
    //"Try asking again."
  ]
};

module.exports = commandObject = {

  "name": "Magic Conch",
  "command": "Magic Conch, <question>?",
  "admin": false,
  "visible": true,
  "description": "Ask the conch a yes or no question.",
  "trigger": {
    "on": "message",
    "filter": (message) => {
      return ((message.content.substr(0, 11).toLowerCase() === "magic conch")
           && _.includes(message.content, "?"));
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
    util.sendMessage(message.channel, {
      "embed": {
        "color": 11699390,
        "title": "The magic conch says...",
        "description": _.sample(internals.CONCH)
      }
    }, true);
  }
};
