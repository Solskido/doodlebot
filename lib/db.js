const mongo = require("mongodb").MongoClient;
let MONGO_URI;
try {
  const auth = require("../auth.json");
  MONGO_URI = auth.MONGO_URI;
}
catch(e) {
  MONGO_URI = process.env.MONGO_URI;
}

let client;
let db;

const _ = require("lodash");
const log = require("./log.js");

const internals = {};

module.exports = {};

internals.connect = () => {
  if(MONGO_URI) {
    return new Promise((resolve, reject) => {
      mongo.connect(MONGO_URI, {
        "useNewUrlParser": true
      },
      (err, mongoClient) => {
        if(err) {
          log(err);
          return reject(err);
        }

        client = mongoClient;
        db = client.db("doodlebot");

        return resolve();
      });
    });
  }

  return Promise.reject(new Error("No Mongo connection."));
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

// Create the "collection" objects
_.forEach([
  "reminders"
], (collectionName) => {
  module.exports[collectionName] = {
    "find": internals._find(collectionName),
    "create": internals._create(collectionName),
    "destroy": internals._destroy(collectionName)
  };
});

process.on("exit", internals.disconnect);
process.on("SIGINT", internals.disconnect);
