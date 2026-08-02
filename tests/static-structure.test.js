"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (filename) => fs.readFileSync(path.join(ROOT, filename), "utf8");

test("loads validation before the application and caches both files", () => {
  const html = read("index.html");
  const worker = read("service-worker.js");
  assert.ok(html.indexOf('src="data-store.js"') < html.indexOf('src="app.js"'));
  assert.match(worker, /"\.\/data-store\.js"/);
  assert.match(worker, /"\.\/app\.js"/);
});

test("exercise search is not an implicitly submitting dialog form", () => {
  const html = read("index.html");
  const picker = html.match(/<dialog[^>]+id="exercise-picker"[\s\S]*?<\/dialog>/)?.[0];
  assert.ok(picker);
  assert.doesNotMatch(picker, /method="dialog"/);
  assert.match(picker, /id="exercise-search"/);
});

test("release metadata is consistent", () => {
  const version = JSON.parse(read("version.json")).version;
  const changelog = JSON.parse(read("changelog.json"));
  assert.equal(version, "1.4.0");
  assert.equal(changelog.entries[0].version, version);
  assert.match(read("service-worker.js"), new RegExp(`gymmi-shell-v${version.replaceAll(".", "\\.")}`));
});
