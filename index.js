const express = require("express");
const fs = require("fs");
const fse = require("fs-extra");
const resolve = require("path").resolve;
const puppeteer = require("puppeteer");
const { minify } = require("html-minifier-terser");
const minimalcss = require("minimalcss");
const vibrantConsole = require("vibrant-console");

vibrantConsole();
const {
  readOptionsFromFile,
  ensureDirExists,
  getValidatedFileName,
  enableLogging,
} = require("./utils");
let app;

/**
 * !Run Server
 * @param {number} port
 * @param {string} routes
 * @param {string} dir
 * @returns {string|boolean}
 */

const isOk = (response) => response.ok() || response.status() === 304;

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
    throw new Error(`Error on Start Server: ${err}`);
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
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true,
      removeComments: true,
      userAgent: options.userAgent,
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
      `Error: Failed to save HTML page for ${route}.\n`,
      "white",
      "black",
      "error"
    );
    throw new Error(`Error on save Html ${err}`);
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
    let css = "";
    const page = await browser.newPage();

    if (options?.userAgent) await page.setUserAgent(options.userAgent);

    await enableLogging(page, pageUrl, () => console.error("Error-End"));

    css = await getCss({ pageUrl, browser, options });

    await page.goto(pageUrl, options);

    await page.evaluate((css) => {
      if (!css) return;
      const head = document.head || document.getElementsByTagName("head")[0],
        style = document.createElement("style");
      style.type = "text/css";
      style.appendChild(document.createTextNode(css));

      if (!head) throw new Error("No <head> element found in document");

      head.appendChild(style);
    }, css);

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
    throw new Error(`Failed to build HTML for ${err}.`);
  }
}

/**
 * @param {string} baseUrl
 * @param {string[]} routes
 * @param {string} dir
 * @param {object} engine
 * @returns {number|undefined}
 */
async function runPuppeteer(baseUrl, routes, outDir, engine) {
  const browser = await puppeteer.launch(engine.launchOptions);

  console.color(
    `[s:bright]Processing routes [s:reverse] [0/${routes.length}]`,
    "white",
    "blue",
    "execution"
  );

  for (let i = 0; i < routes.length; i++) {
    try {
      console.color(
        `[s:bright]Route "${routes[i]}" [s:reverse] [${i + 1}/${
          routes.length
        }]`,
        "white",
        "cyan",
        "execution"
      );
      const htmlData = await getHTMLfromPuppeteerPage(
        browser,
        `${baseUrl}${routes[i]}`,
        engine.gotoOptions
      );

      if (htmlData.html)
        saveHtmlFile(routes[i], htmlData, outDir, engine.gotoOptions);
      else return 0;
    } catch (err) {
      console.error(`Failed to process route '${routes[i]}'`);
      throw new Error(`Page Processing Error${err}`);
    }
  }

  await browser.close();
  return "pages-processed";
}

//* run()
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
  let outDir = options.outDir;
  const buildDir = options.buildDir;

  let routes = options.routes;
  let foldersPaths = options.routes;

  screenshotOption &&
    typeof screenshotOption == "string" &&
    foldersPaths.push(screenshotOption);

  // # Folders

  if (options.keepOriginal && buildDir == outDir) {
    outDir = `${buildDir}/pre-render`;
  }

  if (buildDir != outDir) {
    try {
      await fs.rmSync(outDir, { recursive: true, force: true });
      await fse.copySync(buildDir, `${buildDir}_copy`, { overwrite: true });
      await fs.renameSync(`${buildDir}_copy`, outDir);
    } catch (err) {
      console.error("error on create folders");
      throw new Error(`error on create folders ${err}.`);
    }
  }

  foldersPaths.forEach(
    async (route) => await ensureDirExists(`${outDir}${route}`)
  );
  // #

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

  const staticServerURL = await runStaticServer(options.port, routes, buildDir);

  if (!staticServerURL) return "server-error";

  await runPuppeteer(staticServerURL, routes, outDir, options.engine);

  console.color(
    "Finish react-spa-prerender tasks!",
    "white",
    "purple",
    "green",
    "bright"
  );

  process.exit("pre-render-end");
}

module.exports = {
  run,
};
async function getCss(opt) {
  const { pageUrl, browser, options } = opt;
  const minimalcssResult = await minimalcss.minimize({
    urls: [pageUrl],
    browser: browser,
    userAgent: options.userAgent,
  });
  return minimalcssResult.finalCss;
}
