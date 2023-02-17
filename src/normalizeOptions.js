const readConfig = require("./readOptionsFromFile");
const defaultOptions = require("./defaultOptions");
/**
 * @param  {Object?} defaultOptions
 * @return  {Object} defaultOptions
 */
module.exports = async (paramConfig) => {
  let exit = false;

  const fileOptions = await readConfig(paramConfig?.optionsFile);
  let options = {
    ...fileOptions,
    ...paramConfig,
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
