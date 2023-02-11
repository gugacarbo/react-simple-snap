#!/usr/bin/env node
const { run } = require("./index");

test("return 266", () => {
  expect(run());
});
