const fs = require("fs");
const writeFileSpy = jest.spyOn(fs, "writeFile");
writeFileSpy.mockImplementation((file, data, cb) => cb());

const { mockFs } = require("./helper.js");
const snapRun = require("./snapRun");

describe("cacheAjaxRequests", () => {
  const source = "tests/examples/other";
  const include = ["/ajax-request.html"];
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() => snapRun(fs, { source, include, cacheAjaxRequests: true }));
  test("saves ajax response", () => {
    expect(filesCreated()).toEqual(1);
    expect(content(0)).toMatch(
      'window.snapStore={"\\u002Fjs\\u002Ftest.json":{"test":1}};'
    );
  });
});

describe("preconnectThirdParty", () => {
  const source = "tests/examples/other";
  const include = ["/third-party-resource.html"];
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() => snapRun(fs, { source, include }));
  test("adds <link rel=preconnect>", () => {
    expect(filesCreated()).toEqual(1);
    expect(content(0)).toMatch(
      '<link href="https://fonts.googleapis.com" rel="preconnect">'
    );
  });
});

describe("http2PushManifest", () => {
  const source = "tests/examples/other";
  const include = ["/with-big-css.html"];
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() => snapRun(fs, { source, include, http2PushManifest: true }));
  test("writes http2 manifest file", () => {
    expect(filesCreated()).toEqual(2);
    expect(content(1)).toEqual(
      '[{"source":"/with-big-css.html","headers":[{"key":"Link","value":"</css/big.css>;rel=preload;as=style"}]}]'
    );
  });
});

describe("ignoreForPreload", () => {
  const source = "tests/examples/other";
  const include = ["/with-big-css.html"];
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() =>
    snapRun(fs, {
      source,
      include,
      http2PushManifest: true,
      ignoreForPreload: ["big.css"],
    })
  );
  test("writes http2 manifest file", () => {
    expect(filesCreated()).toEqual(2);
    expect(content(1)).toEqual("[]");
  });
});

describe("preloadImages", () => {
  const source = "tests/examples/other";
  const include = ["/with-image.html"];
  const { fs, filesCreated, content } = mockFs();
  beforeAll(() => snapRun(fs, { source, include, preloadImages: true }));
  test("adds <link rel=preconnect>", () => {
    expect(filesCreated()).toEqual(1);
    expect(content(0)).toMatch(
      '<link as="image" href="/css/bg.png" rel="preload">'
    );
  });
});
