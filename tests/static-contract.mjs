import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const html = read("index.html");
const app = read("js/app.js");
const sw = read("sw.js");

for (const id of ["shareToggle", "syncNowBtn", "syncPushBtn", "authArea", "feedbackInput"]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
}
for (const symbol of ["authLogin", "authSignup", "syncNow", "syncShares", "openPool", "submitFeedback"]) {
  assert.match(app, new RegExp(`function\\s+${symbol}\\b`), `missing ${symbol}`);
}
for (const asset of [
  "./index.html",
  "./css/style.css?v=5",
  "./js/app.js?v=8",
  "./js/share-rows.mjs?v=2",
  "./js/sync-policy.mjs?v=1",
  "./js/supabase-config.js?v=5",
]) {
  assert.ok(sw.includes(JSON.stringify(asset)), `service worker missing ${asset}`);
}
assert.match(html, /<script src=["']js\/app\.js\?v=8["']><\/script>/, "HTML must load the current app bundle");
assert.match(html, /https:\/\/cijianmiaoji\.pages\.dev/, "HTML must link to the Cloudflare Pages main site");
for (const legacyDomain of ["cijianmiaoji.netlify.app", "001100.dpdns.org"]) {
  assert.ok(!html.includes(legacyDomain), `HTML must not contain legacy domain ${legacyDomain}`);
  assert.ok(!app.includes(legacyDomain), `app bundle must not contain legacy domain ${legacyDomain}`);
}
assert.ok(!app.includes('host.includes("dpdns.org")'), "site notice must not branch on the legacy backup hostname");
assert.match(
  app,
  /buildShareRows\(notes,\s*uid,\s*simpleHash,\s*window\.BOOK_NOTES\s*\|\|\s*\{\}\)/,
  "shared-note filtering must receive the book-note provenance map"
);
console.log("static contract passed");
