const _ = require("lodash");
const log = require("../../lib/log.js");
const db = require("../../lib/db.js");

const internals = {};

module.exports = commandObject = {

  "name": "Initialize reminders",
  "command": null,
  "admin": true,
  "visible": false,
  "description": "Recover and set up any pending reminders. Send any that are overdue.",
  "trigger": {
    "on": "alive"
  },

  "register": (doodlebot) => {
    internals.doodlebot = doodlebot;

    return commandObject.trigger;
  },

  "prepare": () => {
    return !!internals.doodlebot;
  },

  "execute": () => {
    log("Setting up reminders.");

    let belated = false;
    const now = new Date();
    return db.reminders.find()
    .then((allReminders) => {
      _.forEach(allReminders, (reminder) => {
        if(new Date(reminder.when).getTime() < now.getTime()) {
          internals.doodlebot.executeManual("Send reminder", reminder);
          belated = true;
        }
        else {
          internals.doodlebot.client.setTimeout((reminder) => {
            internals.doodlebot.executeManual("Send reminder", reminder);
          }, util.msBetween(reminder.when), reminder);
        }
      });

      if(belated) {
        let allChannels = [];
        let allUsers = [];
        _.forEach(allReminders, (reminder) => {
          if(reminder.channel) {
            allChannels.push(reminder.channel);
          }
          else {
            allUsers.push(reminder.who);
          }
        });

        allChannels = _.uniq(allChannels);
        allUsers = _.uniq(allUsers);

        _.forEach(allChannels, (channel) => {
          util.sendMessage(internals.doodlebot.client.channels.get(channel), "Sorry if these reminders are late :\\", true);
        });

        _.forEach(allUsers, (user) => {
          util.sendMessage(internals.doodlebot.client.users.get(user), "Sorry if these reminders are late :\\", true);
        });
      }

      log("Finished setting up reminders.");
    })
    .catch(log);
  }
};
