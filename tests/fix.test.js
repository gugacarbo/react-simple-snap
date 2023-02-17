const fs = require("fs");
const writeFileSpy = jest.spyOn(fs, "writeFile");
writeFileSpy.mockImplementation((file, data, cb) => cb());

const { mockFs } = require("./helper.js");
const snapRun = require("./snapRun");

describe("removeScriptTags", () => {
  const source = "tests/examples/other";
  const include = ["/with-script.html"];
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() => snapRun(fs, { source, include, removeScriptTags: true }));
  test("removes all <script>", () => {
    expect(filesCreated()).toEqual(1);
    expect(content(0)).not.toMatch("<script");
  });
});

describe("fixInsertRule", () => {
  const source = "tests/examples/other";
  const include = ["/fix-insert-rule.html"];
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() => snapRun(fs, { source, include }));
  test("fixes <style> populated with insertRule", () => {
    expect(filesCreated()).toEqual(1);
    expect(content(0)).toMatch('<style id="css-in-js">p{color:red}</style>');
  });
});

describe("fixWebpackChunksIssue", () => {
  const source = "tests/examples/cra";
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() => snapRun(fs, { source }));
  test("creates preload links", () => {
    expect(filesCreated()).toEqual(1);
    expect(content(0)).toMatch(
      '<link as="script" href="/static/js/main.42105999.js" rel="preload"><link as="script" href="/static/js/0.35040230.chunk.js" rel="preload">'
    );
  });
  test("leaves root script", () => {
    expect(content(0)).toMatch(
      '<script src="/static/js/main.42105999.js"></script>'
    );
  });
  test("removes chunk scripts", () => {
    expect(content(0)).not.toMatch(
      '<script src="/static/js/0.35040230.chunk.js"></script>'
    );
  });
});

describe("don't crawl localhost links on different port", () => {
  const source = "tests\\examples\\other";
  const include = ["/localhost-links-different-port.html"];

  const { fs, filesCreated, names } = mockFs();

  beforeAll(() => snapRun(fs, { source, include }));
  test("only one file is crawled", () => {
    expect(filesCreated()).toEqual(1);
    expect(names()).toEqual(
      expect.arrayContaining([
        `\\${source}\\localhost-links-different-port.html`,
      ])
    );
  });
});