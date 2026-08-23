import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const html = read("index.html");
const app = read("js/app.js");
const sw = read("sw.js");
const douyinSearch = read("js/douyin-search.mjs");

for (const id of ["shareToggle", "syncNowBtn", "syncPushBtn", "authArea", "feedbackInput"]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
}
for (const symbol of ["authLogin", "authSignup", "syncNow", "syncShares", "openPool", "submitFeedback"]) {
  assert.match(app, new RegExp(`function\\s+${symbol}\\b`), `missing ${symbol}`);
}
for (const asset of [
  "./index.html",
  "./css/style.css?v=5",
  "./js/app.js?v=9",
  "./js/share-rows.mjs?v=2",
  "./js/sync-policy.mjs?v=1",
  "./js/supabase-config.js?v=5",
  "./js/douyin-search.mjs?v=1",
]) {
  assert.ok(sw.includes(JSON.stringify(asset)), `service worker missing ${asset}`);
}
assert.match(html, /js\/app\.js\?v=9/);
assert.match(sw, /const CACHE = "wbm-cache-v9"/);
for (const asset of ["./js/app.js?v=9", "./js/douyin-search.mjs?v=1"]) {
  assert.ok(sw.includes(JSON.stringify(asset)), `service worker missing ${asset}`);
}
assert.match(html, /<script src=["']js\/app\.js\?v=9["']><\/script>/, "HTML must load the current app bundle");
assert.match(html, /<script type="module" src="js\/douyin-search\.mjs\?v=1"><\/script>/, "HTML must load the Douyin search module");
assert.match(html, /id="douyinImmerse"/, "HTML must include the immersive Douyin button");
assert.match(html, /id="douyinCard"/, "HTML must include the card Douyin button");
assert.match(app, /data-douyin-word/g, "study word renderers must provide a Douyin search word");
assert.match(app, /DouyinSearch\.openDouyinSearch/, "Douyin controls must call the installed launcher");
for (const renderer of ["renderImmWord", "renderCard", "renderMaskList", "renderQuizQ", "renderFav", "drawNotes"]) {
  assert.match(app, new RegExp(`function\\s+${renderer}\\b`), `missing ${renderer}`);
}
assert.match(
  app,
  /if \(!immList\.length\) \{\s*const douyinImmerse = \$\("#douyinImmerse"\);\s*douyinImmerse\.dataset\.douyinWord = "";\s*douyinImmerse\.title = "当前没有可搜索的单词";\s*douyinImmerse\.setAttribute\("aria-label", "当前没有可搜索的单词"\);\s*douyinImmerse\.disabled = true;\s*douyinImmerse\.hidden = true;[\s\S]*?return;/,
  "an empty immersive scope must clear and deactivate the previously rendered Douyin word"
);
assert.match(
  app,
  /const douyinImmerse = \$\("#douyinImmerse"\);\s*douyinImmerse\.hidden = false;\s*douyinImmerse\.disabled = false;\s*douyinImmerse\.dataset\.douyinWord = w\.w;/,
  "a populated immersive scope must restore the current-word Douyin control"
);
assert.match(
  app,
  /q\.type === "w2m"[\s\S]*?data-douyin-word[\s\S]*?: answered \?[\s\S]*?data-douyin-word[\s\S]*?: ""/,
  "meaning-to-word questions must reveal Douyin search only after an answer"
);

const nodeDouyinSearch = await import(new URL("../js/douyin-search.mjs", import.meta.url));
assert.equal(typeof nodeDouyinSearch.openDouyinSearch, "function", "Douyin module must remain importable in Node");
const previousWindow = globalThis.window;
const testWindow = {};
try {
  globalThis.window = testWindow;
  await import(`data:text/javascript;base64,${Buffer.from(douyinSearch).toString("base64")}`);
  assert.equal(typeof testWindow.DouyinSearch?.buildDouyinLinks, "function", "Douyin module must expose its link builder on window");
  assert.equal(typeof testWindow.DouyinSearch?.openDouyinSearch, "function", "Douyin module must expose its launcher on window");
} finally {
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
}
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
