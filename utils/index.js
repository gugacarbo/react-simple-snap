const { enableLogging } = require("./puppeteer.utils");
const normalizePath = (path) => (path === "/" ? "/" : path.replace(/\/$/, ""));




module.exports = {
  normalizeRspOptions: require("./normalizeRspOptions"),
  ensureDirExists: require("./ensureDirExists"),
  getValidatedFileName: require("./getValidatedFileName"),
  readOptionsFromFile: require("./readOptionsFromFile"),
  enableLogging,
  normalizePath,
};
