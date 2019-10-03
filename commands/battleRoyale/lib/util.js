const _ = require("lodash");
const log = require("../../../lib/log.js");
const db = require("../../../lib/db.js");

module.exports = {

  "mapZonesForEmbed": (zones) => {
    const fields = [];
    const games = _.compact(_.uniq(_.map(zones, "game")));
    _.forEach(games, (game) => {
      const gameZones = _.filter(zones, {
        "game": game
      });

      const maps = _.compact(_.uniq(_.map(gameZones, "map")));

      let output = "";
      _.forEach(maps, (map) => {
        let mapZones = _.filter(gameZones, { "map": map });
        mapZones = _.reject(mapZones, (zone) => {
          return _.isUndefined(zone.zone);
        });

        if(_.isEmpty(mapZones)) {
          output += `**${map}**: *No zones*\n`;
        }
        else {
          output += `**${map}**: ${_.map(mapZones, "zone").join(", ")}\n`;
        }
      });

      if(_.isEmpty(maps)) {
        output = "*No maps*";
      }

      fields.push({
        "name": game,
        "value": output
      });
    });

    return fields;
  }
};
