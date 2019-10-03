const _ = require("lodash");
const util = require("../../lib/util.js");
const getInsult = require("insults").default;
const log = require("../../lib/log.js");
const db = require("../../lib/db.js");

const internals = {};

module.exports = commandObject = {

  "name": "View all reminders",
  "command": "!allreminders",
  "admin": true,
  "visible": false,
  "description": "Display all pending reminders.",
  "trigger": {
    "on": "message",
    "filter": (message) => {
      return (message.content === "!allreminders");
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
    log("Executing remind me debug command.");
    db.reminders.find({})
    .then((reminders) => {
      util.sendMessage(message.author, JSON.stringify(reminders, null, 2), true);
      message.react("✅");
    })
    .catch((err) => {
      log(err);
      message.react("❌");
    });
  }
};
