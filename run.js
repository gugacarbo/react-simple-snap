#!/usr/bin/env node

const url = require("url");

const { run } = require("./index.js");
const {
  homepage,
  devDependencies,
  dependencies,
} = require(`${process.cwd()}/package.json`);

const publicUrl = process.env.PUBLIC_URL || homepage;

const reactScriptsVersioclsn = parseInt(
  (devDependencies && devDependencies["react-scripts"]) ||
    (dependencies && dependencies["react-scripts"])
);
let fixWebpackChunksIssue;
switch (reactScriptsVersion) {
  case 1:
    fixWebpackChunksIssue = "CRA1";
    break;
  case 2:
    fixWebpackChunksIssue = "CRA2";
    break;
}

const parcel = Boolean(
  (devDependencies && devDependencies["parcel-bundler"]) ||
    (dependencies && dependencies["parcel-bundler"])
);

if (parcel) {
  if (fixWebpackChunksIssue) {
    console.log("Detected both Parcel and CRA. Fixing chunk names for CRA!");
  } else {
    fixWebpackChunksIssue = "Parcel";
  }
}

//minimal css error. its using old puppeteer version

run({
  publicPath: publicUrl ? url.parse(publicUrl).pathname : "/",
  fixWebpackChunksIssue,
}).catch((error) => {
  console.log(error);
  process.exit(1);
});
