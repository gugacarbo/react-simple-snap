/**
 * @returns {object}
 */
const fs = require("fs");
const normalizeRspOptions = require("./normalizeRspOptions");

async function readOptionsFromFile(fileName = ".snap.json") {
  try {
    const config = await fs.readFileSync(`./${fileName}`);
    const options = normalizeRspOptions(JSON.parse(config.toString()));
    return options;
  } catch (err) {
    console.error(`Failed to read options from '${fileName}'`);
    throw new Error(`.\nMessage: ${err}`);
  }
}
module.exports = readOptionsFromFile;
