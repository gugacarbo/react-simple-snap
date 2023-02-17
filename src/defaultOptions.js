const defaultOptions = {
  //# stable configurations
  port: 45678,
  source: "build",
  destination: null,
  concurrency: 4,
  include: ["/"],
  exclude: [],
  optionsFile: ".snap.json",
  userAgent: "ReactSnap",
  screenshot: false,
  puppeteer: {
    cache: true,
    headless: true,
  },
  puppeteerArgs: [],
  puppeteerExecutablePath: undefined,
  puppeteerIgnoreHTTPSErrors: false,
  publicPath: "/",
  minifyCss: {},
  minifyHtml: {
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    decodeEntities: true,
    keepClosingSlash: true,
    sortAttributes: true,
    sortClassName: false,
  },
  // mobile first approach
  viewport: {
    width: 480,
    height: 850,
  },
  sourceMaps: true,
  //# workarounds
  // using CRA1 for compatibility with previous version will be changed to false in v2
  fixWebpackChunksIssue: "CRA1",
  removeBlobs: true,
  fixInsertRule: true,
  skipThirdPartyRequests: false,
  cacheAjaxRequests: false,
  http2PushManifest: false,
  // may use some glob solution in the future, if required
  // works when http2PushManifest: true
  ignoreForPreload: ["service-worker.js"],
  //# unstable configurations
  preconnectThirdParty: true,
  // Experimental. This config stands for two strategies inline and critical.
  // TODO: inline strategy can contain errors, like, confuse relative urls
  inlineCss: false,
  //# feature creeps to generate screenshots
  saveAs: "html", // | png | jpeg
  crawl: true,
  waitFor: false,
  externalServer: false,
  //# even more workarounds
  removeStyleTags: false,
  preloadImages: false,
  // add async true to script tags
  asyncScriptTags: false,
  //# another feature creep
  // tribute to Netflix Server Side Only React https://twitter.com/NetflixUIE/status/923374215041912833
  // but this will also remove code which registers service worker
  removeScriptTags: false,
};

module.exports = defaultOptions;
