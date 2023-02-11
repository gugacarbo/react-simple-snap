const express = require("express");
const fs = require("fs");
const resolve = require("path").resolve;
const puppeteer = require("puppeteer");
const { minify } = require("html-minifier-terser");
const vibrantConsole = require("vibrant-console");
vibrantConsole();
const {
  readOptionsFromFile,
  ensureDirExists,
  getValidatedFileName,
} = require("./utils");
let app;

/**
 * !Run Server
 * @param {number} port
 * @param {string} routes
 * @param {string} dir
 * @returns {string|boolean}
 */
async function runStaticServer(port, routes, dir) {
  try {
    app = express();
    const resolvedPath = resolve(dir);
    app.use(express.static(resolvedPath));
    routes.forEach((route) => {
      app.get(route, (req, res) => {
        res.sendFile(`${resolvedPath}/index.html`);
      });
    });

    await app.listen(port);
    return `http://localhost:${port}`;
  } catch (err) {
    console.error(`Error: Failed to run puppeteer server on port ${port}`);
    throw new Error(`\nMessage: ${err}`);
  }
}

/**
 *
 * @param {string} route
 * @param {string} html
 * @param {string} dir
 */
async function saveHtmlFile(route, htmlData, dir, options) {
  try {
    const { html, screenshot } = htmlData;

    if (route.indexOf("/") !== route.lastIndexOf("/")) {
      const subDir = route.slice(0, route.lastIndexOf("/"));
      await ensureDirExists(`${dir}${subDir}`);
    }
    const fileName = getValidatedFileName(route);

    let path = `${dir}${fileName}`;
    path = path.replace(/\..*/, "");

    const isSubFolder = await fs.existsSync(path);

    path = isSubFolder ? path : `${dir}${fileName.replace(/\..*/, "")}`;

    const htmlPath = isSubFolder ? `${path}/index.html` : `${path}.html`;
    const miniHtml = await minify(html, {
      removeAttributeQuotes: true,
    });
    await fs.writeFileSync(`${htmlPath}`, miniHtml, {
      encoding: "utf-8",
      flag: "w",
    });

    if (options.screenshot) {
      const screenshotPath = !isSubFolder // rootFolder
        ? `${path}.png`
        : typeof options.screenshot == "string"
        ? `${dir}/screenshots/${fileName.replace(/\..*/, "")}.png`
        : `${path}/screenshot.png`;

      await fs.writeFileSync(`${screenshotPath}`, screenshot, {
        encoding: "base64",
        flag: "w",
      });
    }
    console.success(`Created ${fileName}`);
  } catch (err) {
    console.color(
      `Error: Failed to create HTML page for ${route}.\n`,
      "white",
      "black",
      "error"
    );
    throw new Error(err);
  }
}
/**
 * @param {object} browser
 * @param {string} pageUrl
 * @param {object} options
 * @returns {string|number}
 */
async function getHTMLfromPuppeteerPage(browser, pageUrl, options) {
  try {
    let screenshot = "";
    let html = "";
    const page = await browser.newPage();

    if (options?.userAgent) await page.setUserAgent(options.userAgent);
    await enableLogging(page);

    await page.goto(pageUrl, options);

    html = await page.content();
    if (!html) return 0;

    if (options.screenshot) {
      screenshot = await page.screenshot({
        encoding: "base64",
        type: "png",
      });
    }

    return { html, screenshot };
  } catch (err) {
    console.error(`Failed to build HTML for ${pageUrl}.`);
    throw new Error(err);
  }
}

/**
 * @param {string} baseUrl
 * @param {string[]} routes
 * @param {string} dir
 * @param {object} engine
 * @returns {number|undefined}
 */
async function runPuppeteer(baseUrl, routes, dir, engine) {
  const browser = await puppeteer.launch(engine.launchOptions);
  console.color(
    `[s:bright]Processing routes [s:reverse] [0/${routes.length}]`,
    "white",
    "blue",
    "execution"
  );

  if (engine.seo) {
    fs.copyFile(`${dir}/index.html`, `${dir}/200.html`, (err) => {
      if (err) {
        console.error("On Create 200.html:");
        throw new Error(err);
      } else {
        console.success(`Created [s:bright][s:reverse] /200.html`);
      }
    });
  }

  routes.map(async (route, i) => {
    try {
      console.color(
        `[s:bright]Route "${route}" [s:reverse] [${i + 1}/${routes.length}]`,
        "white",
        "cyan",
        "execution"
      );
      const htmlData = await getHTMLfromPuppeteerPage(
        browser,
        `${baseUrl}${route}`,
        engine.gotoOptions
      );

      if (htmlData.html) saveHtmlFile(route, htmlData, dir, engine.gotoOptions);
      else return 0;
    } catch (err) {
      console.error(`Failed to process route '${route}'`);
      throw new Error(err);
    }
  });

  await browser.close();
  return true;
}

async function run(config) {
  console.color(
    "Start  react-spa-prerender!",
    "white",
    "purple",
    "white",
    "bright"
  );

  const options = config || (await readOptionsFromFile());

  console.color(
    `User Agent [s:reverse] ${options.engine.gotoOptions.userAgent} `,
    "white",
    "cyan",
    "white"
  );

  const screenshotOption = options.engine.gotoOptions.screenshot;

  let routes = options.routes;
  let foldersPaths = options.routes;

  screenshotOption &&
    typeof screenshotOption == "string" &&
    foldersPaths.push(screenshotOption);

  foldersPaths.forEach(
    async (route) => await ensureDirExists(`${options.buildDirectory}${route}`)
  );

  //insert "/index.html" and "/404.html" files
  if (options.seo) {
    if (routes.indexOf("/")) {
      routes.splice(routes.indexOf("/"), 1);
      routes = ["/", "/404", ...routes];
    } else {
      routes = ["/404", ...routes];
    }
  }

  //exclude routes from prerenderings
  if (options.excludedRoutes.length > 0) {
    const excludedRoutes = options.excludedRoutes;
    routes = routes.filter((e) => excludedRoutes.indexOf(e) == -1);
  }

  const staticServerURL = await runStaticServer(
    options.port,
    routes,
    options.buildDirectory
  );

  if (!staticServerURL) return 503;
  await runPuppeteer(
    staticServerURL,
    routes,
    options.buildDirectory,
    options.engine
  );

  console.color(
    "Finish react-spa-prerender tasks!",
    "white",
    "purple",
    "green",
    "bright"
  );
  process.exit();
}

module.exports = {
  run,
};

/**
 * ! Puppeteer Page Log
 * @param {{page: Page, options: {sourceMaps: boolean}, route: string, onError: ?function }} opt
 * @return {void}
 */
const enableLogging = async (opt) => {
  const { page, pageUrl, onError } = opt;
  const route = pageUrl.slice(pageUrl.lastIndexOf("/"), pageUrl.length);
  // const route = pageUrl;

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
        console.error(`>> ${args}`)
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
    console.color("", "black", "black", "info", "hidden");
    console.error(`At ${route}`);
    console.error(`${e}`);
    console.color("", "black", "black", "info", "hidden");
    onError && onError();
  });

  page.on("response", (response) => {
    if (response.status() >= 300) {
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
