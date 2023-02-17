const fs = require("fs");
const writeFileSpy = jest.spyOn(fs, "writeFile");
writeFileSpy.mockImplementation((file, data, cb) => cb());

const { mockFs } = require("./helper.js");
const snapRun = require("./snapRun");

describe("inlineCss - small file", () => {
  const source = "tests\\examples\\other";
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() =>
    snapRun(fs, {
      source,
      inlineCss: true,
      include: ["/with-small-css.html"],
    })
  );
  // 1. I want to change this behaviour
  // see https://github.com/stereobooster/react-snap/pull/133/files
  // 2. There is a bug with relative url in inlined CSS url(bg.png)
  test("whole CSS got inlined for small", () => {
    expect(filesCreated()).toEqual(1);
    expect(content(0)).toMatch(
      '<style type="text/css">div{background:url(bg.png);height:10px}p{background:#000}</style>'
    );
  });
  test("removes <link>", () => {
    expect(content(0)).not.toMatch(
      '<link rel="stylesheet"  href="/css/small.css" >'
    );
  });
});

describe("inlineCss - big file", () => {
  const source = "tests/examples/other";
  const include = ["/with-big-css.html"];
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() => snapRun(fs, { source, include, inlineCss: true }));
  test("inline style", () => {
    expect(filesCreated()).toEqual(1);
    expect(content(0)).toMatch('<style type="text/css">');
  });
  test("inserts <link> in noscript", () => {
    expect(content(0)).toMatch(
      '<noscript><link href="/css/big.css" rel="stylesheet"></noscript>'
    );
  });
  test('inserts <link rel="preload"> with onload', () => {
    expect(content(0)).toMatch(
      '<link href="/css/big.css" rel="preload" as="style" onload="this.rel=\'stylesheet\'">'
    );
  });
  test("inserts loadCSS polyfill", () => {
    expect(content(0)).toMatch('<script type="text/javascript">/*! loadCSS');
  });
});

describe("inlineCss - partial document", () => {
  const source = "tests/examples/partial";
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() => snapRun(fs, { source, inlineCss: true }));
  test("no inline style", () => {
    expect(filesCreated()).toEqual(1);
    expect(content(0)).not.toMatch('<style type="text/css">');
  });
});

describe("removeBlobs", () => {
  const source = "tests/examples/other";
  const include = ["/remove-blobs.html"];
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() => snapRun(fs, { source, include }));
  test("removes blob resources from final html", () => {
    expect(filesCreated()).toEqual(1);
    expect(content(0)).not.toMatch('<link rel="stylesheet" href="blob:');
  });
});

describe("removeStyleTags", () => {
  const source = "tests/examples/other";
  const include = ["/fix-insert-rule.html"];
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() =>
    snapRun(fs, {
      source,
      include,
      removeStyleTags: true,
    })
  );
  test("removes all <style>", () => {
    expect(filesCreated()).toEqual(1);
    expect(content(0)).not.toMatch("<style");
  });
});

describe("asyncScriptTags", () => {
  const source = "tests/examples/other";
  const include = ["/with-script.html"];
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() => snapRun(fs, { source, include, asyncScriptTags: true }));
  test("adds async to all external", () => {
    expect(filesCreated()).toEqual(1);
    expect(content(0)).toMatch('<script async src="js/main.js"></script>');
  });
});
