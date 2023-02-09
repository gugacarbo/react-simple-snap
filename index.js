const express = require("express");
const fs = require("fs");
const resolve = require("path").resolve;
const puppeteer = require("puppeteer");
const consoleColors = require("console-colors");
consoleColors();

const { minify } = require("html-minifier-terser");

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
    const config = await fs.readFileSync("./.snap.json");
    const options = normalizeRspOptions(JSON.parse(config.toString()));
    return options;
  } catch (err) {
    throw new Error(
      `Error: Failed to read options from '.snap.json'.\nMessage: ${err}`
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
async function createNewHTMLPage(route, htmlData, dir) {
  try {
    const [html, screenshot] = htmlData;

    if (route.indexOf("/") !== route.lastIndexOf("/")) {
      const subDir = route.slice(0, route.lastIndexOf("/"));
      await ensureDirExists(`${dir}${subDir}`);
    }

    const fileName = getValidatedFileName(route);

    let path = `${dir}${fileName}`;

    path = path.slice(0, path.indexOf(".html"));

    const fileExists = await fs.existsSync(path);

    path = fileExists ? path : `${dir}${fileName.replace(".html", "")}`;

    const htmlPath = fileExists ? `${path}/index.html` : `${path}.html`;

    const miniHtml = await minify(html, {
      removeAttributeQuotes: true,
    });

    await fs.writeFileSync(`${htmlPath}`, miniHtml, {
      encoding: "utf-8",
      flag: "w",
    });

    const screenshotPath = fileExists
      ? `${path}/screenshot.png`
      : `${path}.png`;

    await fs.writeFileSync(`${screenshotPath}`, screenshot, {
      encoding: "base64",
      flag: "w",
    });

    console.color(`Created ${fileName}`, "white", "green", "success");
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

    page.on("console", (msg) => {
      console.color('', "black", "black", "info", "hidden");
      console.color(
        `Route '${pageUrl.slice(
          pageUrl.lastIndexOf("/"),
          pageUrl.length
        )}' Say:`,
        "white",
        "gray",
        "yellow",
        "bright"
      );
      console.color(`>> ${msg.text()}`, "black", "white", "yellow");
      console.color('', "black", "black", "info", "hidden");
    });

    await page.goto(
      pageUrl,
      Object.assign({ waitUntil: options.waitUntil ?? "networkidle0" }, options)
    );

    const html = await page.content();
    if (!html) return 0;

    const screenshot = await page.screenshot({
      encoding: "base64",
      type: "png",
    });

    return [html, screenshot];
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
    `Processing routes [s:reverse][s:bright] [0/${routes.length}]`,
    "white",
    "blue",
    "execution"
  );

  if (engine.seo) {
    fs.copyFile(`${dir}/index.html`, `${dir}/200.html`, (err) => {
      if (err) {
        console.color(
          "Error on Create 200.html:",
          "red",
          "white",
          "error",
          "blink"
        );
      } else {
        console.color(
          `Created [s:bright] /200.html`,
          "white",
          "green",
          "success",
          "reverse"
        );
      }
    });
  }

  for (let i = 0; i < routes.length; i++) {
    try {
      console.color(
        `[s:bright]Route "${routes[i]}" [s:reverse] [${i + 1}/${routes.length}]`,
        "white",
        "cyan",
        "execution"
      );
      const htmlData = await getHTMLfromPuppeteerPage(
        browser,
        `${baseUrl}${routes[i]}`,
        engine.gotoOptions
      );

      if (htmlData[0]) createNewHTMLPage(routes[i], htmlData, dir);
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

  options.engine.gotoOptions.userAgent =
    options.engine.gotoOptions.userAgent ?? "snapshoter";
  console.color(
    `User Agent [s:reverse] ${options.engine.gotoOptions.userAgent} `,
    "white",
    "cyan",
    "white"
  );

  let r = options.routes;
  let routes;

  const foldersPaths = [
    ...r,
    // "/screenshot"
  ];

  await createFolders(options.buildDirectory, foldersPaths);

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

  await runPuppeteer(
    staticServerURL,
    routes,
    options.buildDirectory,
    Object.assign({ seo: options.seo ?? "true" }, options.engine),
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

async function createFolders(base, paths) {
  await paths.forEach(async (route) => {
    await fs.mkdirSync(`${base}${route}`, { recursive: true }, async (err) => {
      if (err) throw err;
    });
  });
}
