const _ = require("lodash");
const util = require("../lib/util.js");
const meta = require("../package.json");

const internals = {};

module.exports = commandObject = {

  "name": "Commands",
  "command": "!commands",
  "admin": false,
  "visible": true,
  "description": "List all commands.",
  "trigger": {
    "on": "message",
    "filter": (message) => {
      return (message.content === "!commands");
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
    const visiblePublicCommands = _.filter(internals.doodlebot.registeredCommands, (registeredCommand) => {
      return (!registeredCommand.admin && registeredCommand.visible);
    });

    util.sendMessage(message.channel, {
      "embed": {
        "color": 3447003,
        "title": "What can Doodlebob do?",
        "description": "For the commands below, `[]` means the contents of the brackets are optional, and `<>` designates a parameter \
that you're expected to provide.",
        "fields": _.map(visiblePublicCommands, (cmd) => {
          return {
            "name": `**${cmd.name}**: *${cmd.command}*`,
            "value": cmd.description
          };
        }),
        "timestamp": new Date(),
        "footer": {
          "icon_url": internals.doodlebot.client.user.avatarURL,
          "text": `v${meta.version} by solskido`
        }
      }
    }, true);
  }
};
