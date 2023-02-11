#!/usr/bin/env node
const { run } = require("./index");
jest.setTimeout(8000);



test("main test", async () => {
  const originalExit = process.exit;
  process.exit = jest.fn();

  await run();

  expect(process.exit).toHaveBeenCalled();
  process.exit = originalExit;
});

const AppConfig = {
  seo: true,
  buildDir: "/test/dist",
  outDir: "/test/final",
  port: 3332,
  engine: {
    gotoOptions: {
      userAgent: "simple-snap",
      waitUntil: "load",
    },
  },
  routes: ["/"],
};