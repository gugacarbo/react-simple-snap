# react-snap x-ray


## normalizePath

```js

```

## Css

```js
/**
 * @param {{page: Page, pageUrl: string, options: {skipThirdPartyRequests: boolean, userAgent: string}, basePath: string, browser: Browser}} opt
 * @return {Promise}
 */
const inlineCss = async (opt) => {
  const { page, pageUrl, options, basePath, browser } = opt;

  const minimalcssResult = await minimalcss.minimize({
    urls: [pageUrl],
    skippable: (request) =>
      options.skipThirdPartyRequests && !request.url().startsWith(basePath),
    browser: browser,
    userAgent: options.userAgent,
  });
  const criticalCss = minimalcssResult.finalCss;
  const criticalCssSize = Buffer.byteLength(criticalCss, "utf8");

  const result = await page.evaluate(async () => {
    const stylesheets = Array.from(
      document.querySelectorAll("link[rel=stylesheet]")
    );
    const cssArray = await Promise.all(
      stylesheets.map(async (link) => {
        const response = await fetch(link.href);
        return response.text();
      })
    );
    return {
      cssFiles: stylesheets.map((link) => link.href),
      allCss: cssArray.join(""),
    };
  });
  const allCss = new CleanCSS(options.minifyCss).minify(result.allCss).styles;
  const allCssSize = Buffer.byteLength(allCss, "utf8");

  let cssStrategy, cssSize;
  if (criticalCssSize * 2 >= allCssSize) {
    cssStrategy = "inline";
    cssSize = allCssSize;
  } else {
    cssStrategy = "critical";
    cssSize = criticalCssSize;
  }

  if (cssSize > twentyKb)
    console.log(
      `⚠️  warning: inlining CSS more than 20kb (${
        cssSize / 1024
      }kb, ${cssStrategy})`
    );

  if (cssStrategy === "critical") {
    await page.evaluate(
      (criticalCss, preloadPolyfill) => {
        const head = document.head || document.getElementsByTagName("head")[0],
          style = document.createElement("style");
        style.type = "text/css";
        style.appendChild(document.createTextNode(criticalCss));
        head.appendChild(style);
        const noscriptTag = document.createElement("noscript");
        document.head.appendChild(noscriptTag);

        const stylesheets = Array.from(
          document.querySelectorAll("link[rel=stylesheet]")
        );
        stylesheets.forEach((link) => {
          noscriptTag.appendChild(link.cloneNode(false));
          link.setAttribute("rel", "preload");
          link.setAttribute("as", "style");
          link.setAttribute("react-snap-onload", "this.rel='stylesheet'");
          document.head.appendChild(link);
        });

        const scriptTag = document.createElement("script");
        scriptTag.type = "text/javascript";
        scriptTag.text = preloadPolyfill;
        // scriptTag.id = "preloadPolyfill";
        document.body.appendChild(scriptTag);
      },
      criticalCss,
      preloadPolyfill
    );
  } else {
    await page.evaluate((allCss) => {
      if (!allCss) return;

      const head = document.head || document.getElementsByTagName("head")[0],
        style = document.createElement("style");
      style.type = "text/css";
      style.appendChild(document.createTextNode(allCss));

      if (!head) throw new Error("No <head> element found in document");

      head.appendChild(style);

      const stylesheets = Array.from(
        document.querySelectorAll("link[rel=stylesheet]")
      );
      stylesheets.forEach((link) => {
        link.parentNode && link.parentNode.removeChild(link);
      });
    }, allCss);
  }
  return {
    cssFiles: cssStrategy === "inline" ? result.cssFiles : [],
  };
};
```

## get Links from page

```js
/**
 * @param {{page: Page}} opt
 * @return {Promise<Array<string>>}
 */
const getLinks = async (opt) => {
  const { page } = opt;
  const anchors = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a")).map((anchor) => {
      if (anchor.href.baseVal) {
        const a = document.createElement("a");
        a.href = anchor.href.baseVal;
        return a.href;
      }
      return anchor.href;
    })
  );

  const iframes = await page.evaluate(() =>
    Array.from(document.querySelectorAll("iframe")).map((iframe) => iframe.src)
  );
  return anchors.concat(iframes);
};
```

## Auto recursive create folder and subfolder

```js
//require mkdirp
mkdirp.sync(path);
```

## fs copy Stream

```js
fs.createReadStream(path.join(sourceDir, "index.html")).pipe(
  fs.createWriteStream(path.join(sourceDir, "200.html"))
);
```

## process.cwd

```js
// The process.cwd() method returns the current working directory of the Node.js process.
process.cwd();
```

## Require info from package.json

```js
const {
  reactSnap,
  homepage,
  devDependencies,
  dependencies,
} = require(`${process.cwd()}/package.json`);
```

## tracker

```js
/**
 * Sets up event listeners on the Browser.Page instance to maintain a set
 * of URLs that have started but never finished or failed.
 *
 * @param {Object} page
 * @return Object
 */
const createTracker = (page) => {
  const requests = new Set();
  const onStarted = (request) => requests.add(request);
  const onFinished = (request) => requests.delete(request);
  page.on("request", onStarted);
  page.on("requestfinished", onFinished);
  page.on("requestfailed", onFinished);
  return {
    urls: () => Array.from(requests).map((r) => r.url()),
    dispose: () => {
      page.removeListener("request", onStarted);
      page.removeListener("requestfinished", onFinished);
      page.removeListener("requestfailed", onFinished);
    },
  };
};

/**
 * Adds information about timed out URLs if given message is about Timeout.
 *
 * @param {string} message error message
 * @param {Object} tracker ConnectionTracker
 * @returns {string}
 */
const augmentTimeoutError = (message, tracker) => {
  if (message.startsWith("Navigation Timeout Exceeded")) {
    const urls = tracker.urls();
    if (urls.length > 1) {
      message += `\nTracked URLs that have not finished: ${urls.join(", ")}`;
    } else if (urls.length > 0) {
      message += `\nFor ${urls[0]}`;
    } else {
      message += `\nBut there are no pending connections`;
    }
  }
  return message;
};

module.exports = { createTracker, augmentTimeoutError };
```

## Puppeteer Utils

```js
const puppeteer = require("puppeteer");
const _ = require("highland");
const url = require("url");
const mapStackTrace = require("sourcemapped-stacktrace-node").default;
const path = require("path");
const fs = require("fs");
const { createTracker, augmentTimeoutError } = require("./tracker");

const errorToString = (jsHandle) =>
  jsHandle.executionContext().evaluate((e) => e.toString(), jsHandle);

const objectToJson = (jsHandle) => jsHandle.jsonValue();

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

//Take log handler
```

## fetchPage

```js
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
      await page._client.send("ServiceWorker.disable");
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


```

## Crawl

```js
await crawl({
  options,
  basePath,
  publicPath,
  sourceDir,
  beforeFetch: async ({ page, route }) => {
    const { preloadImages, cacheAjaxRequests, preconnectThirdParty } = options;
    if (
      preloadImages ||
      cacheAjaxRequests ||
      preconnectThirdParty ||
      http2PushManifest
    ) {
      const { ajaxCache: ac, http2PushManifestItems: hpm } = preloadResources({
        page,
        basePath,
        preloadImages,
        cacheAjaxRequests,
        preconnectThirdParty,
        http2PushManifest,
        ignoreForPreload: options.ignoreForPreload,
      });
      ajaxCache[route] = ac;
      http2PushManifestItems[route] = hpm;
    }
  },
  afterFetch: async ({ page, route, browser, addToQueue }) => {
    const pageUrl = `${basePath}${route}`;
    if (options.removeStyleTags) await removeStyleTags({ page });
    if (options.removeScriptTags) await removeScriptTags({ page });
    if (options.removeBlobs) await removeBlobs({ page });
    if (options.inlineCss) {
      const { cssFiles } = await inlineCss({
        page,
        pageUrl,
        options,
        basePath,
        browser,
      });

      if (http2PushManifest) {
        const filesToRemove = cssFiles
          .filter((file) => file.startsWith(basePath))
          .map((file) => file.replace(basePath, ""));

        for (let i = http2PushManifestItems[route].length - 1; i >= 0; i--) {
          const x = http2PushManifestItems[route][i];
          filesToRemove.forEach((fileToRemove) => {
            if (x.link.startsWith(fileToRemove)) {
              http2PushManifestItems[route].splice(i, 1);
            }
          });
        }
      }
    }
    if (options.fixWebpackChunksIssue === "CRA2") {
      await fixWebpackChunksIssue2({
        page,
        basePath,
        http2PushManifest,
        inlineCss: options.inlineCss,
      });
    } else if (options.fixWebpackChunksIssue === "CRA1") {
      await fixWebpackChunksIssue1({
        page,
        basePath,
        http2PushManifest,
        inlineCss: options.inlineCss,
      });
    }
    if (options.asyncScriptTags) await asyncScriptTags({ page });

    await page.evaluate((ajaxCache) => {
      const snapEscape = (() => {
        const UNSAFE_CHARS_REGEXP = /[<>\/\u2028\u2029]/g;
        // Mapping of unsafe HTML and invalid JavaScript line terminator chars to their
        // Unicode char counterparts which are safe to use in JavaScript strings.
        const ESCAPED_CHARS = {
          "<": "\\u003C",
          ">": "\\u003E",
          "/": "\\u002F",
          "\u2028": "\\u2028",
          "\u2029": "\\u2029",
        };
        const escapeUnsafeChars = (unsafeChar) => ESCAPED_CHARS[unsafeChar];
        return (str) => str.replace(UNSAFE_CHARS_REGEXP, escapeUnsafeChars);
      })();
      // TODO: as of now it only prevents XSS attack,
      // but can stringify only basic data types
      // e.g. Date, Set, Map, NaN won't be handled right
      const snapStringify = (obj) => snapEscape(JSON.stringify(obj));

      let scriptTagText = "";
      if (ajaxCache && Object.keys(ajaxCache).length > 0) {
        scriptTagText += `window.snapStore=${snapEscape(
          JSON.stringify(ajaxCache)
        )};`;
      }
      let state;
      if (
        window.snapSaveState &&
        (state = window.snapSaveState()) &&
        Object.keys(state).length !== 0
      ) {
        scriptTagText += Object.keys(state)
          .map((key) => `window["${key}"]=${snapStringify(state[key])};`)
          .join("");
      }
      if (scriptTagText !== "") {
        const scriptTag = document.createElement("script");
        scriptTag.type = "text/javascript";
        scriptTag.text = scriptTagText;
        const firstScript = Array.from(document.scripts)[0];
        firstScript.parentNode.insertBefore(scriptTag, firstScript);
      }
    }, ajaxCache[route]);
    delete ajaxCache[route];
    if (options.fixInsertRule) await fixInsertRule({ page });
    await fixFormFields({ page });

    let routePath = route.replace(publicPath, "");
    let filePath = path.join(destinationDir, routePath);
    if (options.saveAs === "html") {
      await saveAsHtml({ page, filePath, options, route, fs });
      let newRoute = await page.evaluate(() => location.toString());
      newPath = normalizePath(
        newRoute.replace(publicPath, "").replace(basePath, "")
      );
      routePath = normalizePath(routePath);
      if (routePath !== newPath) {
        console.log(newPath);
        console.log(`💬  in browser redirect (${newPath})`);
        addToQueue(newRoute);
      }
    } else if (options.saveAs === "png") {
      await saveAsPng({ page, filePath, options, route, fs });
    } else if (options.saveAs === "jpeg") {
      await saveAsJpeg({ page, filePath, options, route, fs });
    }
  },
  onEnd: () => {
    if (server) server.close();
    if (http2PushManifest) {
      const manifest = Object.keys(http2PushManifestItems).reduce(
        (accumulator, key) => {
          if (http2PushManifestItems[key].length !== 0)
            accumulator.push({
              source: key,
              headers: [
                {
                  key: "Link",
                  value: http2PushManifestItems[key]
                    .map((x) => `<${x.link}>;rel=preload;as=${x.as}`)
                    .join(","),
                },
              ],
            });
          return accumulator;
        },
        []
      );
      fs.writeFileSync(
        `${destinationDir}/http2-push-manifest.json`,
        JSON.stringify(manifest)
      );
    }
  },
});
```



## Preload Resources

```js
/**
 *
 * @param {{page: Page, basePath: string}} opt
 */
const preloadResources = (opt) => {
  const {
    page,
    basePath,
    preloadImages,
    cacheAjaxRequests,
    preconnectThirdParty,
    http2PushManifest,
    ignoreForPreload,
  } = opt;
  const ajaxCache = {};
  const http2PushManifestItems = [];
  const uniqueResources = new Set();
  page.on("response", async (response) => {
    const responseUrl = response.url();
    if (/^data:|blob:/i.test(responseUrl)) return;
    const ct = response.headers()["content-type"] || "";
    const route = responseUrl.replace(basePath, "");
    if (/^http:\/\/localhost/i.test(responseUrl)) {
      if (uniqueResources.has(responseUrl)) return;
      if (preloadImages && /\.(png|jpg|jpeg|webp|gif|svg)$/.test(responseUrl)) {
        if (http2PushManifest) {
          http2PushManifestItems.push({
            link: route,
            as: "image",
          });
        } else {
          await page.evaluate((route) => {
            const linkTag = document.createElement("link");
            linkTag.setAttribute("rel", "preload");
            linkTag.setAttribute("as", "image");
            linkTag.setAttribute("href", route);
            document.body.appendChild(linkTag);
          }, route);
        }
      } else if (cacheAjaxRequests && ct.includes("json")) {
        const json = await response.json();
        ajaxCache[route] = json;
      } else if (http2PushManifest && /\.(js)$/.test(responseUrl)) {
        const fileName = url.parse(responseUrl).pathname.split("/").pop();
        if (!ignoreForPreload.includes(fileName)) {
          http2PushManifestItems.push({
            link: route,
            as: "script",
          });
        }
      } else if (http2PushManifest && /\.(css)$/.test(responseUrl)) {
        const fileName = url.parse(responseUrl).pathname.split("/").pop();
        if (!ignoreForPreload.includes(fileName)) {
          http2PushManifestItems.push({
            link: route,
            as: "style",
          });
        }
      }
      uniqueResources.add(responseUrl);
    } else if (preconnectThirdParty) {
      const urlObj = url.parse(responseUrl);
      const domain = `${urlObj.protocol}//${urlObj.host}`;
      if (uniqueResources.has(domain)) return;
      uniqueResources.add(domain);
      await page.evaluate((route) => {
        const linkTag = document.createElement("link");
        linkTag.setAttribute("rel", "preconnect");
        linkTag.setAttribute("href", route);
        document.head.appendChild(linkTag);
      }, domain);
    }
  });
  return { ajaxCache, http2PushManifestItems };
};
```


## Fix forms

```js
const fixFormFields = ({ page }) => {
  return page.evaluate(() => {
    Array.from(document.querySelectorAll("[type=radio]")).forEach((element) => {
      if (element.checked) {
        element.setAttribute("checked", "checked");
      } else {
        element.removeAttribute("checked");
      }
    });
    Array.from(document.querySelectorAll("[type=checkbox]")).forEach(
      (element) => {
        if (element.checked) {
          element.setAttribute("checked", "checked");
        } else {
          element.removeAttribute("checked");
        }
      }
    );
    Array.from(document.querySelectorAll("option")).forEach((element) => {
      if (element.selected) {
        element.setAttribute("selected", "selected");
      } else {
        element.removeAttribute("selected");
      }
    });
  });
};
```

