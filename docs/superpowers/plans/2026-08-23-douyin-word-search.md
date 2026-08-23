# Douyin Word Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Douyin search button beside every visible study word, trying the Douyin client first on every device and falling back to Douyin web search.

**Architecture:** A focused ES module owns word normalization, URL construction, client launch, visibility detection, and timed web fallback. The existing app renders buttons and delegates clicks to that module; view-specific renderers decide when a word is visible so quizzes and masks do not reveal hidden answers.

**Tech Stack:** Static HTML/CSS, browser JavaScript, ES modules, Node.js contract tests, Service Worker, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-08-23-douyin-word-search-design.md`

## Global Constraints

- Search exactly the current English word; do not append extra query text.
- Every device tries `snssdk1128://search?keyword=<encoded word>` first.
- Fall back after 1500 ms to `https://www.douyin.com/search/<encoded word>` unless the page becomes hidden.
- Do not reveal the English answer before a Chinese-to-English quiz question is answered.
- Do not send account, Supabase, note, progress, or email data to Douyin.
- Do not change learning, authentication, synchronization, sharing, vocabulary, or progress behavior.

---

### Task 1: Implement the tested Douyin launcher module

**Files:**
- Create: `js/douyin-search.mjs`
- Create: `tests/douyin-search-contract.mjs`

**Interfaces:**
- Produces: `normalizeDouyinWord(value): string`.
- Produces: `buildDouyinLinks(value): null | { word: string, appUrl: string, webUrl: string }`.
- Produces: `openDouyinSearch(value, options?): { launched: boolean, links?: object, cancel?: Function }`.
- `options` accepts injectable `windowRef`, `documentRef`, and `fallbackDelay` for deterministic tests.

- [ ] **Step 1: Write the failing module contract**

Create `tests/douyin-search-contract.mjs` with assertions equivalent to:

```js
import assert from "node:assert/strict";
import {
  buildDouyinLinks,
  normalizeDouyinWord,
  openDouyinSearch,
} from "../js/douyin-search.mjs";

assert.equal(normalizeDouyinWord("  ambition  "), "ambition");
assert.equal(normalizeDouyinWord(null), "");
assert.deepEqual(buildDouyinLinks("ice cream & tea"), {
  word: "ice cream & tea",
  appUrl: "snssdk1128://search?keyword=ice%20cream%20%26%20tea",
  webUrl: "https://www.douyin.com/search/ice%20cream%20%26%20tea",
});
assert.equal(buildDouyinLinks("   "), null);

const navigations = [];
const timers = [];
const listeners = new Map();
const windowRef = {
  location: { assign: (url) => navigations.push(url) },
  setTimeout: (fn, delay) => (timers.push({ fn, delay }), timers.length),
  clearTimeout: () => {},
};
const documentRef = {
  hidden: false,
  addEventListener: (name, fn) => listeners.set(name, fn),
  removeEventListener: (name) => listeners.delete(name),
};
const result = openDouyinSearch("ambition", { windowRef, documentRef, fallbackDelay: 1500 });
assert.equal(result.launched, true);
assert.deepEqual(navigations, ["snssdk1128://search?keyword=ambition"]);
assert.equal(timers[0].delay, 1500);
timers[0].fn();
assert.deepEqual(navigations, [
  "snssdk1128://search?keyword=ambition",
  "https://www.douyin.com/search/ambition",
]);
```

Add a second fake environment where `documentRef.hidden` becomes `true` and the registered `visibilitychange` callback runs before the timer; assert that the web URL is not navigated. Assert that an empty word returns `{ launched: false }` and performs no navigation.

- [ ] **Step 2: Verify RED**

Run:

```powershell
node tests/douyin-search-contract.mjs
```

Expected: failure with `ERR_MODULE_NOT_FOUND` for `js/douyin-search.mjs`.

- [ ] **Step 3: Implement the minimal launcher**

Create `js/douyin-search.mjs` with this behavior:

```js
export const normalizeDouyinWord = (value) => String(value ?? "").trim();

export function buildDouyinLinks(value) {
  const word = normalizeDouyinWord(value);
  if (!word) return null;
  const encoded = encodeURIComponent(word);
  return {
    word,
    appUrl: `snssdk1128://search?keyword=${encoded}`,
    webUrl: `https://www.douyin.com/search/${encoded}`,
  };
}

export function openDouyinSearch(value, options = {}) {
  const links = buildDouyinLinks(value);
  if (!links) return { launched: false };
  const windowRef = options.windowRef ?? window;
  const documentRef = options.documentRef ?? document;
  const fallbackDelay = options.fallbackDelay ?? 1500;
  let cancelled = false;
  let timerId;
  const cleanup = () => {
    if (timerId !== undefined) windowRef.clearTimeout(timerId);
    documentRef.removeEventListener("visibilitychange", onVisibilityChange);
  };
  const cancel = () => {
    cancelled = true;
    cleanup();
  };
  const onVisibilityChange = () => {
    if (documentRef.hidden) cancel();
  };
  documentRef.addEventListener("visibilitychange", onVisibilityChange);
  timerId = windowRef.setTimeout(() => {
    if (cancelled || documentRef.hidden) return;
    cleanup();
    windowRef.location.assign(links.webUrl);
  }, fallbackDelay);
  try {
    windowRef.location.assign(links.appUrl);
  } catch {
    cleanup();
    windowRef.location.assign(links.webUrl);
  }
  return { launched: true, links, cancel };
}
```

- [ ] **Step 4: Verify GREEN and syntax**

Run:

```powershell
node tests/douyin-search-contract.mjs
node --check js/douyin-search.mjs
```

Expected: the contract prints `douyin search contract passed`; syntax check exits 0.

- [ ] **Step 5: Commit**

```powershell
git add js/douyin-search.mjs tests/douyin-search-contract.mjs
git commit -m "feat: add tested Douyin search launcher"
```

---

### Task 2: Add Douyin buttons to every visible study word

**Files:**
- Modify: `index.html`
- Modify: `js/app.js`
- Modify: `css/style.css`
- Modify: `tests/static-contract.mjs`

**Interfaces:**
- Consumes: `window.DouyinSearch.openDouyinSearch(word)` installed by `js/douyin-search.mjs`.
- Produces: buttons carrying `data-douyin-word="<escaped word>"` in all six required study surfaces.

- [ ] **Step 1: Extend the static contract before production changes**

In `tests/static-contract.mjs`, read `js/douyin-search.mjs` and add assertions for:

```js
assert.match(html, /<script type="module" src="js\/douyin-search\.mjs\?v=1"><\/script>/);
assert.match(html, /id="douyinImmerse"/);
assert.match(html, /id="douyinCard"/);
assert.match(app, /data-douyin-word/g);
assert.match(app, /DouyinSearch\.openDouyinSearch/);
for (const renderer of ["renderImmWord", "renderCard", "renderMaskList", "renderQuizQ", "renderFav", "drawNotes"]) {
  assert.match(app, new RegExp(`function\\s+${renderer}\\b`));
}
```

Also assert that the Chinese-to-English branch only adds `data-douyin-word` when `answered` is truthy.

- [ ] **Step 2: Verify RED**

Run:

```powershell
node tests/static-contract.mjs
```

Expected: failure because the module script and buttons do not exist.

- [ ] **Step 3: Load the module and add static detail buttons**

Before `js/app.js` in `index.html`, add:

```html
<script type="module" src="js/douyin-search.mjs?v=1"></script>
```

Add `id="douyinImmerse"` beside `#speakImmerse` and `id="douyinCard"` beside `#speakCard`:

```html
<button class="external-search-btn" id="douyinImmerse" data-douyin-word="" title="在抖音搜索">🎵 抖音搜索</button>
```

The module must expose its tested launcher after defining exports:

```js
if (typeof window !== "undefined") {
  window.DouyinSearch = { buildDouyinLinks, openDouyinSearch };
}
```

- [ ] **Step 4: Add one delegated click path**

At the start of the existing document click delegation in `js/app.js`, add:

```js
const douyinBtn = e.target.closest("[data-douyin-word]");
if (douyinBtn) {
  e.preventDefault();
  const word = douyinBtn.dataset.douyinWord;
  if (word && window.DouyinSearch) window.DouyinSearch.openDouyinSearch(word);
  return;
}
```

In `renderImmWord()` and `renderCard()`, assign the current word to the static button dataset and update its title/ARIA label.

- [ ] **Step 5: Render compact buttons in dynamic surfaces**

Add this escaped pattern beside visible words in mask rows, quiz word-to-meaning questions, answered meaning-to-word questions, final wrong-word results, favorites, and notes:

```js
`<button class="external-search-btn sm" data-douyin-word="${esc(w.w)}" title="在抖音搜索 ${esc(w.w)}" aria-label="在抖音搜索 ${esc(w.w)}">🎵</button>`
```

For English-masked rows, hide the button while `.mask-word` has class `masked` and reveal it in the existing side-click handler at the same moment the English word is revealed. For `m2w` quiz questions, do not render the button until `answered` is truthy.

- [ ] **Step 6: Add focused styling**

In `css/style.css`, add `.external-search-btn` styles matching the existing rounded controls, with a compact `.sm` form, visible keyboard focus, hover state, and `touch-action: manipulation`. Do not include it in `body.no-tts` selectors because Douyin search must remain available when speech synthesis is disabled.

- [ ] **Step 7: Verify GREEN and all regressions**

Run:

```powershell
Get-ChildItem tests -Filter '*.mjs' | Sort-Object Name | ForEach-Object { node $_.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
node --check js/app.js
node --check js/douyin-search.mjs
git diff --check
```

Expected: all contracts pass and all syntax checks exit 0.

- [ ] **Step 8: Commit**

```powershell
git add index.html js/app.js css/style.css tests/static-contract.mjs
git commit -m "feat: add Douyin search to study words"
```

---

### Task 3: Update PWA caching, verify, deploy, and publish source

**Files:**
- Modify: `index.html`
- Modify: `sw.js`
- Modify: `tests/static-contract.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: `js/douyin-search.mjs?v=1` and the updated app bundle.
- Produces: PWA cache `wbm-cache-v9`, `js/app.js?v=9`, deployed Cloudflare Pages production, and pushed GitHub `main`.

- [ ] **Step 1: Write the failing PWA contract**

Update `tests/static-contract.mjs` to require:

```js
assert.match(html, /js\/app\.js\?v=9/);
assert.match(sw, /const CACHE = "wbm-cache-v9"/);
for (const asset of ["./js/app.js?v=9", "./js/douyin-search.mjs?v=1"]) {
  assert.ok(sw.includes(JSON.stringify(asset)), `service worker missing ${asset}`);
}
```

- [ ] **Step 2: Verify RED**

Run `node tests/static-contract.mjs` and expect a failure on cache/app version 8.

- [ ] **Step 3: Apply the PWA version update**

Change `index.html` to load `js/app.js?v=9`. Change `sw.js` to `wbm-cache-v9`, replace the app asset with `./js/app.js?v=9`, and add `./js/douyin-search.mjs?v=1`.

- [ ] **Step 4: Run the complete local verification**

Run every contract, syntax-check `js/app.js`, `js/douyin-search.mjs`, `js/share-rows.mjs`, `js/sync-policy.mjs`, and `sw.js`, then run `git diff --check`. Start a local static server and inspect the six surfaces in a browser. Confirm mask and Chinese-to-English quiz buttons remain hidden until the word is revealed.

- [ ] **Step 5: Commit the release metadata**

Document the Douyin behavior and unofficial-Scheme fallback in `README.md`, then commit:

```powershell
git add index.html sw.js tests/static-contract.mjs README.md
git commit -m "docs: release Douyin word search"
```

- [ ] **Step 6: Build and deploy the exact production artifact**

Create a package containing only the same 19 production files as the prior deployment plus `js/douyin-search.mjs` (20 files total). Hash each asset with the Cloudflare Pages BLAKE3 protocol, register hashes, upload missing assets, verify `check-missing=[]`, and create a production deployment for project `cijianmiaoji`, branch `main`, using the exact release commit hash.

- [ ] **Step 7: Verify production and GitHub**

Fresh GET requests must return HTTP 200 for `/`, `/sw.js`, `/manifest.webmanifest`, and `/js/douyin-search.mjs?v=1`. Browser-check at least one large and one compact button. Push `main` to `origin`, then confirm `git rev-parse HEAD` equals `git ls-remote origin refs/heads/main` and the worktree is clean.
