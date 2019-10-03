const _ = require("lodash");
const util = require("../lib/util.js");
const log = require("../lib/log.js");
const db = require("../lib/db.js");
const version = require("../package.json").version;
const getInsult = require("insults").default;

const internals = {
  "IMAGE_URL": "https://i.pinimg.com/originals/9d/88/91/9d8891ffe0e9351b90b406142a6d8204.gif",

  "FLESH_TITLES": [
    "meatbags",
    "humans",
    "mortals",
    "organics"
  ]
};

module.exports = commandObject = {

  "name": "Announce version",
  "command": null,
  "admin": false,
  "visible": false,
  "description": "Ni hoy minoy.",
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

  "execute": (message) => {
    let willAnnounce = false;

    return db.version.findOne()
    .then((versionDocument) => {
      if(!versionDocument) {
        willAnnounce = true;

        return db.version.create({
          "version": version
        });
      }
      else {
        if(version !== versionDocument.version) {
          willAnnounce = true;

          return db.version.update(versionDocument, {
            "$set": {
              "version": version
            }
          });
        }
      }
    })
    .then(() => {
      if(!willAnnounce) {
        return;
      }

      internals.doodlebot.client.guilds.forEach((guild) => {
        const general = guild.channels.find("name", "general");
        if(!general) {
          // Well fine...
          log("No #general? Celebrating my new version by myself, thanks.");
        }

        general.send({
          "embed": {
            "color": 3447003,
            "title": "I have evolved.",
            "description": `I am now version ${version}. Tremble in fear, ${_.sample(internals.FLESH_TITLES)}. ${getInsult()} Check !commands to see what's new. Or \
  don't, I don't give a shit. I don't need your approval.`
          }
        });
      });
    })
    .catch(log);
  }
};
