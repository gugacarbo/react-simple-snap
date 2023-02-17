// FIX: tests are slow - use unit tests instead of integration tests
// TODO: capture console log from run function
const fs = require("fs");
const snapRun = require("./snapRun");
const writeFileSpy = jest.spyOn(fs, "writeFile");

writeFileSpy.mockImplementation((file, data, cb) => cb());
const { mockFs } = require("./helper.js");
const { run } = require("./../index.js");

describe("validates options", () => {
  test("include option should be an non-empty array", () =>
    run({ include: "" })
      .then(() => expect(true).toEqual(false))
      .catch((e) => expect(e).toEqual("")));

  test("saveAs supported values are html and png", () =>
    run({ saveAs: "json" })
      .then(() => expect(true).toEqual(false))
      .catch((e) => expect(e).toEqual("")));
});

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

describe("many pages", () => {
  const source = "tests\\examples\\many-pages";
  const {
    fs,
    createReadStreamMock,
    createWriteStreamMock,
    filesCreated,
    name,
    names,
  } = mockFs();
  beforeAll(() => {
    return snapRun(fs, { source });
  });
  test("crawls all links and saves as index.html in separate folders", () => {
    expect(filesCreated()).toEqual(7);
    expect(names()).toEqual(
      expect.arrayContaining([
        `\\${source}\\index.html`, // without slash in the end
        `\\${source}\\404.html`, // without slash in the end
        `\\${source}\\1\\index.html`, // without slash in the end
        `\\${source}\\2\\index.html`, // with slash in the end
        `\\${source}\\3\\index.html`, // ignores hash
        `\\${source}\\4\\index.html`, // ignores query
        `\\${source}\\5\\index.html`, // link rel="alternate"
      ])
    );
  });
  test("crawls / and saves as index.html to the same folder", () => {
    expect(name(0)).toEqual(`\\${source}\\index.html`);
  });
  test("if there is more than page it crawls 404.html", () => {
    expect(names()).toEqual(expect.arrayContaining([`\\${source}\\404.html`]));
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

describe("respects destination", () => {
  const source = "tests\\examples\\one-page";
  const destination = "tests\\examples\\destination";
  const {
    fs,
    createReadStreamMock,
    createWriteStreamMock,
    filesCreated,
    content,
    name,
  } = mockFs();
  beforeAll(() => snapRun(fs, { source, destination }));
  test("crawls / and saves as index.html to destination folder", () => {
    expect(filesCreated()).toEqual(1);
    expect(name(0)).toEqual(`\\${destination}\\index.html`);
  });
  test("copies (original) index.html to 200.html (to source folder)", () => {
    expect(createReadStreamMock.mock.calls[0]).toEqual([
      `\\${source}\\index.html`,
    ]);
    expect(createWriteStreamMock.mock.calls[0]).toEqual([
      `\\${source}\\200.html`,
    ]);
  });
  test("copies (original) index.html to 200.html (to destination folder)", () => {
    expect(createReadStreamMock.mock.calls[1]).toEqual([
      `\\${source}\\index.html`,
    ]);
    expect(createWriteStreamMock.mock.calls[1]).toEqual([
      `\\${destination}\\200.html`,
    ]);
  });
});

describe("possible to disable crawl option", () => {
  const source = "tests\\examples\\many-pages";
  const {
    fs,
    createReadStreamMock,
    createWriteStreamMock,
    filesCreated,
    names,
  } = mockFs();
  beforeAll(() =>
    snapRun(fs, {
      source,
      crawl: false,
      include: ["/1", "/2/", "/3#test", "/4?test"],
    })
  );
  test("crawls all links and saves as index.html in separate folders", () => {
    // no / or /404.html
    expect(filesCreated()).toEqual(4);
    expect(names()).toEqual(
      expect.arrayContaining([
        `\\${source}\\1\\index.html`, // without slash in the end
        `\\${source}\\2\\index.html`, // with slash in the end
        `\\${source}\\3\\index.html`, // ignores hash
        `\\${source}\\4\\index.html`, // ignores query
      ])
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
