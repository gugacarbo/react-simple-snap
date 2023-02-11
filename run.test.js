#!/usr/bin/env node
const { run } = require("./index");
jest.setTimeout(8000);
test("main test", async () => {
  const result = await run();
  expect(result).toBe("pre-render-end");
});
