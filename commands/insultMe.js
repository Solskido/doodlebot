const _ = require("lodash");
const util = require("../lib/util.js");
const getInsult = require("insults").default;

const internals = {};

module.exports = commandObject = {

  "name": "Insult me",
  "command": "!insultme",
  "admin": false,
  "visible": true,
  "description": "I fling a real zinger at you.",
  "trigger": {
    "on": "message",
    "filter": (message) => {
      return (message.content === "!insultme");
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
    util.sendMessage(message.channel, getInsult(), true);
  }
};
