/**
 * @param {{
 *    port: 3000,
 *    seo: true,
 *    buildDir: "/dist",
 *    outDir: "/dist",
 *    routes: ["/"],
 *    excludedRoutes: ["/excluded"]
 *    engine: {
 *      gotoOptions: {
 *        screenshot : true, //<bool|string>
 *        userAgent: "react-simple-snap",
 *        waitUntil: "networkidle0"
 *      },
 *    }
 *  }} options
 *    
 *  if (options.viewport) {
    //   await page.setViewport(options.viewport);
    // }
    // if (options.timeout !== undefined) {
    //   await page.setDefaultNavigationTimeout(options.timeout);
    // }
 */

module.exports = function (options) {
  //* Defaults
  const engine = {};
  const seo = options.seo || true;

  const routes = options.routes || ["/"];
  const excludedRoutes = options.excludeRoutes ?? [];
  const port = options.port || 3000;

  const buildDir = options.buildDir ? `.${options.buildDir}` : `./dist`;
  let outDir = options.outDir ? `.${options.outDir}` : buildDir;

  if (options.engine) {
    engine.launchOptions = options.engine.launchOptions || {};
    engine.gotoOptions = options.engine.gotoOptions || {};
  } else {
    engine.launchOptions = {};
    engine.gotoOptions = {};
  }

  //propagate config
  engine.seo = seo;
  engine.launchOptions.seo = seo;
  engine.gotoOptions.seo = seo;

  //? window.userAgent = "react-simple-snap"
  engine.gotoOptions.userAgent =
    options.engine.gotoOptions.userAgent ?? "react-simple-snap";

  //? puppeter.Page.gotoOptions.waitUntil = "networkidle0"
  engine.gotoOptions.waitUntil =
    options.engine.gotoOptions.waitUntil ?? "networkidle0";

  //? puppeter.Page.gotoOptions.screenshot = true
  engine.gotoOptions.screenshot = options.engine.gotoOptions.screenshot ?? true;
  //* Defaults

  return {
    port,
    seo,
    routes,
    excludedRoutes,
    buildDir,
    outDir,
    engine,
  };
};
