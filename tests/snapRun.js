// FIX: tests are slow - use unit tests instead of integration tests
// TODO: capture console log from run function
const fs = require("fs");
const writeFileSpy = jest.spyOn(fs, "writeFile");
writeFileSpy.mockImplementation((file, data, cb) => cb());

const { mockFs } = require("./helper.js");
const { run } = require("./../index.js");

jest.setTimeout(20000);

const snapRun = (fs, options) =>
  run(
    {
      puppeteerArgs: ["--no-sandbox", "--disable-setuid-sandbox"],
      port: Math.floor(Math.random() * 1000 + 45000),
      ...options,
    },
    {
      fs,
    }
  );
describe("one page", () => {
  const source = "tests\\examples\\one-page";
  const {
    fs,
    createReadStreamMock,
    createWriteStreamMock,
    filesCreated,
    content,
    name,
  } = mockFs();
  beforeAll(() => snapRun(fs, { source }));
  test("crawls / and saves as index.html to the same folder", () => {
    expect(filesCreated()).toEqual(1);
    expect(name(0)).toEqual(`\\${source}\\index.html`);
    expect(content(0)).toEqual(
      '<html lang="en"><head><meta charset="utf-8"></head><body><script>document.body.appendChild(document.createTextNode("test"));</script>test</body></html>'
    );
  });
  test("copies (original) index.html to 200.html", () => {
    expect(createReadStreamMock.mock.calls).toEqual([
      [`\\${source}\\index.html`],
    ]);
    expect(createWriteStreamMock.mock.calls).toEqual([
      [`\\${source}\\200.html`],
    ]);
  });
});

module.exports = snapRun;
