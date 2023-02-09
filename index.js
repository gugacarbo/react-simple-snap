const express = require("express");
const fs = require("fs");
const resolve = require("path").resolve;
const puppeteer = require("puppeteer");


const {
  normalizeRspOptions,
  ensureDirExists,
  getValidatedFileName,
} = require("./utils");
let app;

/**
 * @returns {object}
 */
async function readOptionsFromFile() {
  try {
    const config = await fs.readFileSync("./.rsp.json");
    const options = normalizeRspOptions(JSON.parse(config.toString()));
    return options;
  } catch (err) {
    throw new Error(
      `Error: Failed to read options from '.rsp.json'.\nMessage: ${err}`
    );
  }
}

/**
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
        1;
      });
    });

    await app.listen(port);
    return `http://localhost:${port}`;
  } catch (err) {
    throw new Error(
      `Error: Failed to run puppeteer server on port ${port}.\nMessage: ${err}`
    );
  }
}

/**
 *
 * @param {string} route
 * @param {string} html
 * @param {string} dir
 */
async function createNewHTMLPage(route, html, dir, seo = true) {
  try {
    if (route.indexOf("/") !== route.lastIndexOf("/")) {
      const subDir = route.slice(0, route.lastIndexOf("/"));
      await ensureDirExists(`${dir}${subDir}`);
    }

    const fileName = getValidatedFileName(route);

    await fs.writeFileSync(`${dir}${fileName}`, html, {
      encoding: "utf-8",
      flag: "w",
    });

    console.color(`Created ${fileName}`, "white", "green", "success");

    if (seo && fileName == "/index.html") {
      await fs.writeFileSync(`${dir}/200.html`, html, {
        encoding: "utf-8",
        flag: "w",
      });
      console.color(
        `Created /200.html`,
        "white",
        "green",
        "success",
        "reverse"
      );
    }
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
    const page = await browser.newPage();
    if (options?.userAgent) await page.setUserAgent(options.userAgent);

    await page.goto(
      pageUrl,
      Object.assign({ waitUntil: "networkidle0" }, options)
    );

    const html = await page.content();
    if (!html) return 0;

    return html;
  } catch (err) {
    throw new Error(
      `Error: Failed to build HTML for ${pageUrl}.\nMessage: ${err}`
    );
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
    `Processing routes [0/${routes.length}]`,
    "white",
    "blue",
    "execution"
  );
  for (let i = 0; i < routes.length; i++) {
    try {
      console.color(
        `Route [${i + 1}/${routes.length}] "${routes[i]}" `,
        "white",
        "cyan",
        "execution"
      );
      const html = await getHTMLfromPuppeteerPage(
        browser,
        `${baseUrl}${routes[i]}`,
        engine.gotoOptions
      );

      if (html) createNewHTMLPage(routes[i], html, dir, engine.seo);
      else return 0;
    } catch (err) {
      console.color(
        `Error: Failed to process route '${routes[i]}'`,
        "white",
        "red",
        "error"
      );
      throw new Error(err);
    }
  }

  await browser.close();
  return;
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

  let r = options.routes;
  let routes;
  if (options.seo != false) {
    if (r.indexOf("/") == -1) {
      routes = ["/404", ...r];
    } else {
      const index = r.indexOf("/");
      r.splice(index, 1);
      routes = ["/", "/404", ...r];
    }
  } else {
    routes = r;
  }
  const staticServerURL = await runStaticServer(
    options.port,
    routes,
    options.buildDirectory
  );

  if (!staticServerURL) return 0;
  options.engine.seo = options.seo;
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

