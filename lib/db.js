const mongo = require("mongodb").MongoClient;
let MONGODB_URI;
try {
  const auth = require("../auth.json");
  MONGODB_URI = auth.MONGODB_URI;
}
catch(e) {
  MONGODB_URI = process.env.MONGODB_URI;
}

let client;
let db;

const _ = require("lodash");
const log = require("./log.js");

const internals = {};

module.exports = {};

internals.connect = () => {
  if(MONGODB_URI) {
    return new Promise((resolve, reject) => {
      mongo.connect(MONGODB_URI, {
        "useNewUrlParser": true
      },
      (err, mongoClient) => {
        if(err) {
          log(err);
          return reject(err);
        }

        client = mongoClient;
        console.log(internals.getDBName(MONGODB_URI));
        db = client.db(internals.getDBName(MONGODB_URI));

        return resolve();
      });
    });
  }

  return Promise.reject(new Error("No Mongo connection."));
};

internals.DB_REGEX = /\/[^\/]*$/;
internals.getDBName = (uri) => {
  return uri.match(internals.DB_REGEX)[0].substr(1);
};

internals.disconnect = () => {
  if(client) {
    client.close();
  }

  process.exit();
};

internals.resolveCollection = (collectionName) => {
  if(!client) {
    return internals.connect()
    .then(() => {
      return internals.resolveCollection(collectionName);
    })
    .catch((err) => {
      log(err);
      return Promise.reject(err);
    });
  }

  if(!db) {
    return Promise.reject("No Mongo database.");
  }

  const collection = db.collection(collectionName);
  if(!collection) {
    return Promise.reject("No Mongo collection.");
  }

  return Promise.resolve(collection);
};

internals._find = (collectionName) => {
  return (query) => {
    return internals.resolveCollection(collectionName)
    .then((collection) => {
      return collection.find(query)
      .toArray();
    });
  };
};

internals._findOne = (collectionName) => {
  return (query) => {
    return internals.resolveCollection(collectionName)
    .then((collection) => {
      return collection.findOne(query);
    });
  };
};

internals._create = (collectionName) => {
  return (document) => {
    return internals.resolveCollection(collectionName)
    .then((collection) => {
      return collection.insertOne(document);
    });
  };
};

internals._destroy = (collectionName) => {
  return (query) => {
    return internals.resolveCollection(collectionName)
    .then((collection) => {
      return collection.deleteOne(query);
    });
  };
};

internals._distinct = (collectionName) => {
  return (query) => {
    return internals.resolveCollection(collectionName)
    .then((collection) => {
      return collection.distinct(query);
    });
  };
};

// Create the "collection" objects
_.forEach([
  "brgames",
  "brmaps",
  "brdropzones",
  "reminders"
], (collectionName) => {
  log(`Setting up ${collectionName} collection.`)
  module.exports[collectionName] = {
    "find": internals._find(collectionName),
    "findOne": internals._findOne(collectionName),
    "create": internals._create(collectionName),
    "destroy": internals._destroy(collectionName),
    "distinct": internals._distinct(collectionName)
  };
  log(module.exports[collectionName] ? "Done" : "Error");
});

log(_.keys(module.exports));

process.on("exit", internals.disconnect);
process.on("SIGINT", internals.disconnect);
