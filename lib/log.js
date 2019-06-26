let IS_TEST = false;
try {
  const auth = require("../auth.json");
  IS_TEST = auth.botTest;
}
catch(e) {
  IS_TEST = process.env.botTest;
}

module.exports = function() {
  if(IS_TEST) {
    console.log.apply(console, arguments);
  }
};
