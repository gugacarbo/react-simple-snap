#!/usr/bin/env node
const { run } = require("./index");

test("main test", async () => {
  const result = await run();
  expect(result).toBe("pre-render-end");
});

