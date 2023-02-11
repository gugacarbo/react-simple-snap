const fs = require("fs");

/**
 *
 * @param {string} dir
 * @returns {Promise}
 */
module.exports = async function (dir) {
  try {
    return await fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error(`Failed to create directory for path ${dir}`);
    throw new Error(`${err}`);
  }
};
