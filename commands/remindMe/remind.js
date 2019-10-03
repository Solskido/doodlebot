const _ = require("lodash");
const log = require("../../lib/log.js");
const db = require("../../lib/db.js");

const internals = {};

module.exports = commandObject = {

  "name": "Send reminder",
  "command": null,
  "admin": true,
  "visible": false,
  "description": "Send a pending reminder.",
  "trigger": {
    "on": "manual"
  },

  "register": (doodlebot) => {
    internals.doodlebot = doodlebot;

    return commandObject.trigger;
  },

  "prepare": () => {
    return !!internals.doodlebot;
  },

  "execute": (reminder) => {
    let channel;
    if(reminder.channel) {
      channel = internals.doodlebot.client.channels.get(reminder.channel);
    }
    else {
      channel = internals.doodlebot.client.users.get(reminder.who);
    }

log(channel);
    util.sendMessage(channel, `<@${reminder.who}>, reminder ${reminder.what}`, true);
    db.reminders.destroy(reminder);
  }
};
