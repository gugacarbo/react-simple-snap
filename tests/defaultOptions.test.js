const defaultOptions = require("../src/defaultOptions");

test("defaultOptions", () => {
  expect(defaultOptions).toMatchSnapshot();
});
