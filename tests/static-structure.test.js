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
  assert.match(worker, /"\.\/icons\.svg"/);
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
  assert.equal(version, "1.5.1");
  assert.equal(changelog.entries[0].version, version);
  assert.match(read("service-worker.js"), new RegExp(`gymmi-shell-v${version.replaceAll(".", "\\.")}`));
});

test("title bar close button opens a local and reversible blue screen", () => {
  const html = read("index.html");
  const app = read("app.js");
  const styles = read("styles.css");
  const titleBarStyles = styles.match(/\.title-bar\s*\{[\s\S]*?\}/)?.[0];
  assert.match(html, /id="app-close-button"/);
  assert.match(html, /id="bsod"[^>]+role="alertdialog"[^>]+hidden/);
  assert.match(html, /0028:C0011E36/);
  assert.doesNotMatch(html, /GAINZ|PROTEIN/);
  assert.match(titleBarStyles, /display:\s*flex/);
  assert.match(titleBarStyles, /justify-content:\s*space-between/);
  assert.match(app, /appCloseButton\.addEventListener\("click", showCrashScreen\)/);
  assert.match(app, /bsod\.addEventListener\("click", hideCrashScreen\)/);
  assert.match(app, /desktop\.inert = true/);
  assert.match(app, /desktop\.inert = false/);
});

test("backup reminder and local pixel icon sprite are present", () => {
  const html = read("index.html");
  const app = read("app.js");
  const icons = read("icons.svg");
  assert.match(html, /id="backup-reminder-dialog"/);
  assert.match(app, /BACKUP_REMINDER_INTERVAL = 7 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(app, /data-action="edit-library-exercise"/);
  for (const icon of ["floppy", "clock", "chart", "controls", "download", "import", "shield", "edit"]) {
    assert.match(icons, new RegExp(`id="${icon}"`));
  }
});
