const fs = require("fs");
const snapRun = require("./snapRun");
const writeFileSpy = jest.spyOn(fs, "writeFile");

writeFileSpy.mockImplementation((file, data, cb) => cb());
const { mockFs } = require("./helper.js");

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
  beforeAll(() => snapRun(fs, { source, inlineCss:true }));
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
