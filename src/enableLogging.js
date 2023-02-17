/**
 * ! Puppeteer Page Log
 * @param {{page: Page, options: {sourceMaps: boolean}, route: string, onError: ?function }} opt
 * @return {void}
 */
const mapStackTrace = require("sourcemapped-stacktrace-node").default;

const errorToString = (jsHandle) =>
  jsHandle.executionContext().evaluate((e) => e.toString(), jsHandle);

const objectToJson = (jsHandle) => jsHandle.jsonValue();

const enableLogging = async ({
  page,
  options,
  route,
  onError,
  sourcemapStore,
}) => {
  page.on("console", (msg) => {
    const text = msg.text();
    console.color("", "black", "black", "info", "hidden");
    if (text === "JSHandle@object") {
      console.color(`Route '${route}' Say:`, "white", "black", "info");
      Promise.all(msg.args().map(objectToJson)).then((args) =>
        console.color(`>> ${args}`, "black", "white", "yellow")
      );
    } else if (text === "JSHandle@error") {
      console.error(`Route '${route}' Error:`);
      Promise.all(msg.args().map(errorToString)).then((args) =>
        console.color(...args)
      );
    } else {
      console.color(`Route '${route}' Say:`, "white", "black", "info");
      console.color(`>> ${text}`, "white", "black", "info");
    }
    console.color("", "black", "black", "info", "hidden");
  });

  page.on("error", (msg) => {
    console.color("", "black", "black", "info", "hidden");
    console.error(`At ${route}:`);
    console.error(`${msg}`);
    console.color("", "black", "black", "info", "hidden");
    onError && onError();
  });

  page.on("pageerror", (e) => {
    if (options.sourceMaps) {
      mapStackTrace(e.stack || e.message, {
        isChromeOrEdge: true,
        store: sourcemapStore || {},
      })
        .then((result) => {
          // TODO: refactor mapStackTrace: return array not a string, return first row too
          const stackRows = result.split("\n");
          const puppeteerLine =
            stackRows.findIndex((x) => x.includes("puppeteer")) ||
            stackRows.length - 1;

          console.log(
            `🔥  pageerror at ${route}: ${
              (e.stack || e.message).split("\n")[0] + "\n"
            }${stackRows.slice(0, puppeteerLine).join("\n")}`
          );
        })
        .catch((e2) => {
          console.error(`  pageerror at ${route}: ${e}`);
          console.log(
            `️️️⚠️  warning at ${route} (error in source maps):`,
            e2.message
          );
        });
    } else {
      console.error(`pageerror at ${route}: \n${e}`);
    }
    onError && onError();
  });

  page.on("response", (response) => {
    if (response.status() >= 400) {
      console.error("", "black", "black", "info", "hidden");
      console.error(
        `️️️warning at ${route}: got ${response.status()} HTTP code for ${response.url()}`
      );
      console.error(`${msg}`);
      console.color("", "black", "black", "info", "hidden");
      onError && onError();
    }
  });
  page.on("requestfailed", (msg) => {
    console.error(`${route} requestfailed:`);
    console.error(`${msg}`);
  });
};

module.exports = enableLogging;
