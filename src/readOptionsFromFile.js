/**
 * @returns {object}
 */
const fs = require("fs");

async function readOptionsFromFile(path = ".snap.json") {
  let fileName = path;
  if (fileName.startsWith("/")) {
    fileName = fileName.slice(0);
  }

  try {
    const config = await fs.readFileSync(`${process.cwd()}/${fileName}`);
    const options = JSON.parse(config.toString());
    return options;
  } catch (err) {
    console.error(`Failed to read options from '${fileName}'`);
    throw new Error(`.\nMessage: ${err}`);
  }
}
module.exports = readOptionsFromFile;
