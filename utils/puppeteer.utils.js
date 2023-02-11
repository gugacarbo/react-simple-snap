/**
 * ! Puppeteer Page Log
 * @param {{page: Page, options: {sourceMaps: boolean}, route: string, onError: ?function }} opt
 * @return {void}
 */
const enableLogging = async (page, pageUrl, onError) => {
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
      Promise.all(
        msg.args().map((args) => console.error(`>> ${args.message}`))
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

module.exports = {
  enableLogging,
};
