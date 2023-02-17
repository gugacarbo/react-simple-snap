/**
 * @return {{
 *  }} options
 */

const readConfig = require("./readOptionsFromFile");
const defaultOptions = require("./defaultOptions");

module.exports = async (userOptions) => {
  let exit = false;

  const fileOptions = await readConfig(userOptions?.optionsFile);
  let options = {
    ...fileOptions,
    ...userOptions,
  };
  if (!options.include || !options.include.length) {
    console.log("🔥 include option should be an non-empty array");
    exit = "include option should be an non-empty array";
  }
  if (exit) throw new Error("ConfigError");

  options = {
    ...defaultOptions,
    ...options,
  };
  options.destination = options.destination || options.source;

  if (options.minifyHtml && !options.minifyHtml.minifyCSS) {
    options.minifyHtml.minifyCSS = options.minifyCss;
  }

  if (!options.publicPath.startsWith("/")) {
    options.publicPath = `/${options.publicPath}`;
  }
  options.publicPath = options.publicPath.replace(/\/$/, "");

  options.include = options.include.map(
    (include) => options.publicPath + include
  );
  return options;
};
