const puppeteer = require("puppeteer");
const _ = require("highland");
const url = require("url");
const path = require("path");
const fs = require("fs");
const { createTracker, augmentTimeoutError } = require("./tracker");
const enableLogging = require("./enableLogging");
const color = require("vibrant-console");
color();

/**
 * @param {{page: Page, options: {skipThirdPartyRequests: true}, basePath: string }} opt
 * @return {Promise<void>}
 */
const skipThirdPartyRequests = async (opt) => {
  const { page, options, basePath } = opt;
  if (!options.skipThirdPartyRequests) return;
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.url().startsWith(basePath)) {
      request.continue();
    } else {
      request.abort();
    }
  });
};

/**
 * @param {{page: Page, options: {sourceMaps: boolean}, route: string, onError: ?function }} opt
 * @return {void}
 */

/**
 * @param {{page: Page}} opt
 * @return {Promise<Array<string>>}
 */
const getLinks = async (opt) => {
  const { page } = opt;
  const anchors = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a,link[rel='alternate']")).map(
      (anchor) => {
        if (anchor.href.baseVal) {
          const a = document.createElement("a");
          a.href = anchor.href.baseVal;
          return a.href;
        }
        return anchor.href;
      }
    )
  );

  const iframes = await page.evaluate(() =>
    Array.from(document.querySelectorAll("iframe")).map((iframe) => iframe.src)
  );
  return anchors.concat(iframes);
};

/**
 * can not use null as default for function because of TS error https://github.com/Microsoft/TypeScript/issues/14889
 *
 * @param {{options: *, basePath: string, beforeFetch: ?(function({ page: Page, route: string }):Promise), afterFetch: ?(function({ page: Page, browser: Browser, route: string }):Promise), onEnd: ?(function():void)}} opt
 * @return {Promise}
 */
const crawl = async (opt) => {
  const {
    options,
    basePath,
    beforeFetch,
    afterFetch,
    onEnd,
    publicPath,
    sourceDir,
  } = opt;
  let shuttingDown = false;
  let streamClosed = false;

  const onSigint = () => {
    if (shuttingDown) {
      process.exit(1);
    } else {
      shuttingDown = true;
      console.log(
        "\nGracefully shutting down. To exit immediately, press ^C again"
      );
    }
  };
  process.on("SIGINT", onSigint);

  const onUnhandledRejection = (error) => {
    console.log("🔥  UnhandledPromiseRejectionWarning", error);
    shuttingDown = true;
  };
  process.on("unhandledRejection", onUnhandledRejection);

  const queue = _();
  let enqued = 0;
  let processed = 0;
  // use Set instead
  const uniqueUrls = new Set();
  const sourcemapStore = {};

  /**
   * @param {string} path
   * @returns {void}
   */
  const addToQueue = (newUrl) => {
    const { hostname, search, hash, port } = url.parse(newUrl);
    newUrl = newUrl.replace(`${search || ""}${hash || ""}`, "");

    if (newUrl.endsWith("/")) {
      newUrl = newUrl.slice(0, -1);
    }
    // Ensures that only link on the same port are crawled
    //
    // url.parse returns a string,
    // but options port is passed by a user and default value is a number
    // we are converting both to string to be sure
    // Port can be null, therefore we need the null check
    const isOnAppPort = port && port.toString() === options.port.toString();

    if (
      hostname === "localhost" &&
      isOnAppPort &&
      !uniqueUrls.has(newUrl) &&
      !streamClosed
    ) {
      uniqueUrls.add(newUrl);
      enqued++;
      queue.write(newUrl);
      if (enqued == 2 && options.crawl) {
        addToQueue(`${basePath}${publicPath}/404.html`);
      }
    }
  };

  const browser = await puppeteer.launch({
    //headless: true, //options.puppeteer.headless,
    args: options.puppeteerArgs,
    //executablePath: options.puppeteerExecutablePath,
    ignoreHTTPSErrors: options.puppeteerIgnoreHTTPSErrors,
    handleSIGINT: true,
  });

  /**
   * @param {string} pageUrl
   * @returns {Promise<string>}
   */
  const fetchPage = async (pageUrl) => {
    const route = pageUrl.replace(basePath, "");

    let skipExistingFile = false;
    const routePath = route.replace(/\//g, path.sep);
    const { ext } = path.parse(routePath);
    if (ext !== ".html" && ext !== "") {
      const filePath = path.join(sourceDir, routePath);
      skipExistingFile = fs.existsSync(filePath);
    }

    if (!shuttingDown && !skipExistingFile) {
      try {
        const page = await browser.newPage();
        //await page._client.send("ServiceWorker.disable");
        await page.setCacheEnabled(options.puppeteer.cache);
        if (options.viewport) await page.setViewport(options.viewport);
        if (options.skipThirdPartyRequests)
          await skipThirdPartyRequests({ page, options, basePath });
        enableLogging({
          page,
          options,
          route,
          onError: () => {
            shuttingDown = true;
          },
          sourcemapStore,
        });
        beforeFetch && beforeFetch({ page, route });
        await page.setUserAgent(options.userAgent);
        const tracker = createTracker(page);
        try {
          await page.goto(pageUrl, { waitUntil: "networkidle0" });
        } catch (e) {
          e.message = augmentTimeoutError(e.message, tracker);
          throw e;
        } finally {
          tracker.dispose();
        }
        if (options.waitFor) await page.waitFor(options.waitFor);
        if (options.crawl) {
          const links = await getLinks({ page });
          links.forEach(addToQueue);
        }
        afterFetch && (await afterFetch({ page, route, browser, addToQueue }));
        await page.close();
        console.log(`✅  crawled ${processed + 1} out of ${enqued} (${route})`);
      } catch (e) {
        if (!shuttingDown) {
          console.log(`🔥  error at ${route}`, e);
        }
        shuttingDown = true;
      }
    } else {
      // this message creates a lot of noise
      // console.log(`🚧  skipping (${processed + 1}/${enqued}) ${route}`);
    }
    processed++;
    if (enqued === processed) {
      streamClosed = true;
      queue.end();
    }
    return pageUrl;
  };

  if (options.include) {
    options.include.map((x) => addToQueue(`${basePath}${x}`));
  }

  return new Promise((resolve, reject) => {
    queue
      .map((x) => _(fetchPage(x)))
      .mergeWithLimit(options.concurrency)
      .toArray(async () => {
        process.removeListener("SIGINT", onSigint);
        process.removeListener("unhandledRejection", onUnhandledRejection);
        await browser.close();
        onEnd && onEnd();
        if (shuttingDown) return reject("");
        resolve();
      });
  });
};

exports.skipThirdPartyRequests = skipThirdPartyRequests;
exports.enableLogging = enableLogging;
exports.getLinks = getLinks;
exports.crawl = crawl;
