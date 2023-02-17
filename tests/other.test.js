// FIX: tests are slow - use unit tests instead of integration tests
// TODO: capture console log from run function
const fs = require("fs");
const writeFileSpy = jest.spyOn(fs, "writeFile");
writeFileSpy.mockImplementation((file, data, cb) => cb());

const { mockFs } = require("./helper.js");
const snapRun = require("./snapRun");

describe("You can not run react-snap twice", () => {
  const source = "tests/examples/processed";
  const { fs } = mockFs();
  test("returns rejected promise", () =>
    snapRun(fs, { source })
      .then(() => expect(true).toEqual(false))
      .catch((e) => expect(e).toEqual("")));
});

describe("handles JS errors", () => {
  const source = "tests/examples/other";
  const include = ["/with-script-error.html"];
  const { fs } = mockFs();
  test("returns rejected promise", () =>
    snapRun(fs, { source, include })
      .then(() => expect(true).toEqual(false))
      .catch((e) => expect(e).toEqual("")));
});

describe("link to file", () => {
  const source = "tests\\examples\\other";
  const include = ["/link-to-file.html"];
  const { fs, names } = mockFs();
  beforeAll(() => snapRun(fs, { source, include }));
  test("link to non-html file", () => {
    expect(names()).not.toEqual(
      expect.arrayContaining([`\\${source}\\css\\bg.png`])
    );
  });
  test("link to html file", () => {
    expect(names()).toEqual(
      expect.arrayContaining([`\\${source}\\index.html`])
    );
  });
});

describe("snapSaveState", () => {
  const source = "tests/examples/other";
  const include = ["/snap-save-state.html"];
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() => snapRun(fs, { source, include }));
  test("JSON compatible values", () => {
    expect(filesCreated()).toEqual(1);
    expect(content(0)).toMatch('window["json"]=["",1,true,null,{}];');
  });

  const date = new Date(Date.UTC(2000, 0, 1, 3, 0, 0));
  const isoDateTimeString = date.toISOString();

  test("non-JSON compatible values", () => {
    // those don't work
    expect(content(0)).toMatch(
      `window["non-json"]=[null,"${isoDateTimeString}",null,{}];`
    );
  });
  // this test doesn't work
  test("protects from XSS attack", () => {
    expect(content(0)).toMatch('window["xss"]="\\u003C\\u002Fscript\\u003E');
  });
});

describe("saves state of form elements changed via JS", () => {
  const source = "tests/examples/other";
  const include = ["/form-elements.html"];
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() => snapRun(fs, { source, include }));
  test("radio button", () => {
    expect(filesCreated()).toEqual(1);
    expect(content(0)).toMatch(
      '<input checked name="radio" type="radio" value="radio1">'
    );
  });
  test("checkbox", () => {
    expect(content(0)).toMatch(
      '<input checked name="checkbox" type="checkbox" value="checkbox1">'
    );
  });
  test("select", () => {
    expect(content(0)).toMatch('<option selected value="option1">');
  });
});

describe("svgLinks", () => {
  const source = "tests/examples/other";
  const include = ["/svg.html"];
  const { fs, filesCreated } = mockFs();
  beforeAll(() => snapRun(fs, { source, include }));
  test("Find SVG Links", () => {
    expect(filesCreated()).toEqual(3);
  });
});

describe("history.pushState", () => {
  const source = "tests\\examples\\other";
  const include = ["/history-push.html"];
  const { fs, filesCreated, names } = mockFs();
  beforeAll(() => snapRun(fs, { source, include }));
  test("in case of browser redirect it creates 2 files", () => {
    expect(filesCreated()).toEqual(3);
    expect(names()).toEqual(
      expect.arrayContaining([
        `\\${source}\\404.html`,
        `\\${source}\\history-push.html`,
        `\\${source}\\hello\\index.html`,
      ])
    );
  });
});

describe("history.pushState in sub-directory", () => {
  const source = "tests\\examples\\other";
  const include = ["/history-push.html"];
  const { fs, filesCreated, names } = mockFs();
  beforeAll(() => snapRun(fs, { source, include, publicPath: "/other" }));
  test("in case of browser redirect it creates 2 files", () => {
    expect(filesCreated()).toEqual(3);
    expect(names()).toEqual(
      expect.arrayContaining([
        `\\${source}\\404.html`,
        `\\${source}\\history-push.html`,
        `\\${source}\\hello\\index.html`,
      ])
    );
  });
});

describe("history.pushState two redirects to the same file", () => {
  const source = "tests\\examples\\other";
  const include = ["/history-push.html", "/history-push-more.html"];
  const { fs, filesCreated, names } = mockFs();
  beforeAll(() => snapRun(fs, { source, include, publicPath: "/other" }));
  test("in case of browser redirect it creates 2 files", () => {
    expect(filesCreated()).toEqual(4);
    expect(names()).toEqual(
      expect.arrayContaining([
        `\\${source}\\404.html`,
        `\\${source}\\history-push.html`,
        `\\${source}\\hello\\index.html`,
        `\\${source}\\history-push-more.html`,
      ])
    );
  });
});
