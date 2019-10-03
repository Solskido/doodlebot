/**
 * Doodlebot
 * solskido@gmail.com
 */

process.on("uncaughtException", (exception) => {
  console.log(exception);
});

let token;
let IS_TEST = false;
try {
  const auth = require("./auth.json");
  token = auth.token;
  IS_TEST = auth.botTest;
}
catch(e) {
  token = process.env.token;
  IS_TEST = process.env.botTest;
}

if(!token) {
  console.log("No token. Soiled it.");
  return 0;
}

const Discord = require("discord.js");
const _ = require("lodash");
const db = require("./lib/db.js");
const log = require("./lib/log.js");
const util = require("./lib/util.js");
const fs = require("fs");
const path = require("path");
const Promise = require("bluebird");

const doodlebot = {
  "client": new Discord.Client(),
  "registeredCommands": [],
  "executeManual": (commandName, data) => {
    const targetCommand = _.find(doodlebot.registeredCommands, { "name": commandName });
    if(!targetCommand) {
      throw new Error(`There's no registered command by the name "${commandName}".`);
    }

    if(targetCommand.prepare()) {
      targetCommand.execute(data);
    }
  }
};

const internals = {

  "messageListeners": [],
  "registerCommand": (command) => {
    if(!command
    || _.isEqual(command, {})) {
      return;
    }

    if(_.includes(_.map(doodlebot.registeredCommands, "name"), command.name)) {
      throw new Error(`There is more than one command with the same name: "${command.name}".`);
    }

    if(command.command
    && _.includes(_.map(doodlebot.registeredCommands, "command"), command.command)) {
      throw new Error(`There is more than one command with the same trigger: "${command.command}".`);
    }

    if(!_.isFunction(command.register)) {
      throw new Error(`The command named "${command.name}" must have a registration function.`);
    }

    const commandTrigger = command.register(doodlebot);
    if(!commandTrigger
    || !commandTrigger.on) {
      throw new Error(`The command named "${command.name}" must specify a trigger in its registration function's return value.`);
    }

    // Set up the trigger
    switch(commandTrigger.on) {
      case "manual":
        // Nothing to set up
        doodlebot.registeredCommands.push(command);
        log(`Manual command "${command.name}" registered.`);
        break;
      case "message":
        // Register ourselves in the command listener
        internals.messageListeners.push({
          "command": command.name,
          "priority": (commandTrigger.priority || 0),
          "admin": command.admin,
          "filter": commandTrigger.filter
        });
        doodlebot.registeredCommands.push(command);
        log(`Message command "${command.name}" registered.`);
        break;
      case "alive":
        // This will be called shortly after being registered
        doodlebot.registeredCommands.push(command);
        log(`On alive command "${command.name}" registered.`);
        break;
      default:
        throw new Error(`The command named "${command.name}" specified an unknown trigger "${commandTrigger.on}".`);
    }
  }
};

log("Logging in.");
doodlebot.client.login(token)
.then(() => {
  log("Logged in.");
})
.catch(log);

doodlebot.client.once("ready", () => {
  log("Registering commands.");

  // Register all commands.
  new Promise((resolve, reject) => {
    fs.readdir("./commands", {
      "withFileTypes": true
    },
    (err, files) => {
      if(err) {
        return reject(err);
      }

      return Promise.map(files, (file) => {
        if(file.isDirectory()) {
          // One level of subdirectories are flattened to
          // allow for logical command grouping (packages).
          const subdirectory = file.name;

          return new Promise((resolve, reject) => {
            fs.readdir(path.join("./commands", file.name), {
              "withFileTypes": true
            },
            (err, files) => {
              if(err) {
                return reject(err);
              }

              _.forEach(files, (file) => {
                // Any subsequent subdirectory is assumed to be for command package library organization
                if(!file.isDirectory()) {
                  if(file.name.substr(0, 1) !== ".") {
                    internals.registerCommand(require(`./commands/${subdirectory}/${file.name}`));
                  }
                }
              });

              return resolve();
            });
          });
        }

        if(file.name.substr(0, 1) !== ".") {
          internals.registerCommand(require(`./commands/${file.name}`));
        }

        return Promise.resolve();
      }, {
        "concurrency": 1
      })
      .then(resolve)
      .catch(reject);
    });
  })
  .then(() => {
    log("Done registering commands.");

    log("Initializing libraries.");
    return util.init(doodlebot);
  })
  .then(() => {
    log("Done initializing libraries.");

    log("Executing all on alive triggers.");
    const onAliveCommands = _.filter(doodlebot.registeredCommands, (registeredCommand) => {
      return (_.has(registeredCommand, "trigger.on")
          && (registeredCommand.trigger.on === "alive"));
    });

    if(_.isEmpty(onAliveCommands)) {
      return Promise.resolve();
    }

    return Promise.map(onAliveCommands, (onAliveCommand) => {
      log(`Executing "${onAliveCommand.name}" on alive.`);
      if(onAliveCommand.prepare()) {
        return onAliveCommand.execute();
      }
    });
  })
  .then(() => {
    log("Done executing all on alive triggers.");

    log("Ready for action!");
  })
  .catch((err) => {
    log(err);
  });
});

doodlebot.client.on("message", (message) => {
  if(!message
  || !doodlebot.client) {
    log("Fatal error, no message to handle.");
    return;
  }

  if(message.author.id === doodlebot.client.user.id) {
    log("Message from self.");
    return;
  }

  const listeners = _.filter(internals.messageListeners, (messageListener) => {
    if(messageListener.filter) {
      return messageListener.filter(message);
    }
  });

  if(_.isEmpty(listeners)) {
    // The message satisfied none of the listeners.
    return;
  }

  let listenerSubset = listeners;
  if(listeners.length > 1) {
    // Multiple listeners claim this message is for them

    // Exclude admin-only commands when the caller is not an admin in a guild context, and when the user is not the global admin
    // when outside of a guild context
    if(!util.messageIsFromAnyAdmin(message)) {
      listenerSubset = _.reject(listenerSubset, { "admin": true });
    }

    // If there are still multiple listeners, exclude all but the highest priority
    if(listenerSubset.length > 1) {
      listenerSubset = _.filter(listenerSubset, { "priority": _.max(_.map(listenerSubset, "priority")) });

      // Worst-case scenario, there's a listener overlap that needs to be addressed
      if(listenerSubset.length > 1) {
        log(`Unable to determine a priority between "${_.map(listenerSubset, "command").join(", ")}".`);
        message.react("❌");
        return;
      }
    }
  }

  if(_.isEmpty(listeners)) {
    // The message satisfied none of the listeners.
    return;
  }

  let listener = listenerSubset[0];

  log("Message received! " + message.content);
  log(`Message interpreted as "${listener.command}" command.`);

  const command = _.find(doodlebot.registeredCommands, { "name": listener.command });
  if(!command) {
    log(`Whoops. Somehow a listener was registered for a command that doesn't exist: "${listener.command}".`);
    message.react("❌");
    return;
  }

  if(command.admin
  && !util.messageIsFromAnyAdmin(message)) {
    log(`A non-admin user (${message.author.username}#${message.author.discriminator}) attempted an admin bot command.`);
    message.react("❌");
    return;
  }

  const prepped = command.prepare(message);
  if(prepped) {
    command.execute(message);
  }
  else {
    log(`The "${command.name}" command failed to prepare to execute.`);
    message.react("❌");
    return;
  }
});
