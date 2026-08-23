# Douyin Desktop Web Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route Douyin word searches directly to the Douyin website in a new tab on desktop browsers, while preserving the existing App-first behavior and timed web fallback on phones and tablets.

**Architecture:** Keep URL construction and launch policy inside `js/douyin-search.mjs`. Add one pure device-classification function and branch immediately after building links: desktop uses a synchronous, isolated `window.open`; mobile and tablet reuse the existing Scheme, visibility listener, and 1500 ms fallback path. Version the ES module and Service Worker cache together so installed PWAs receive the new policy.

**Tech Stack:** Static HTML/CSS, browser JavaScript, ES modules, Node.js contract tests, Service Worker, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-08-23-douyin-desktop-web-routing-design.md`

## Global Constraints

- Treat phones and tablets as mobile; Android tablets and iPads must keep App-first behavior.
- Treat Windows, macOS, Linux, touch-screen PCs, and unknown platforms as desktop unless a positive mobile/tablet signal is present.
- Desktop must call `window.open(webUrl, "_blank", "noopener,noreferrer")` synchronously and must never attempt the App Scheme, create the fallback timer, or register `visibilitychange`.
- If the desktop popup is blocked or `window.open` throws, navigate the current tab to the same web URL.
- Mobile and tablet must retain the existing `snssdk1128://` launch, 1500 ms fallback, hidden-page cancellation, and immediate web fallback when Scheme navigation throws.
- Search exactly the current English word; do not append extra query text or send account, Supabase, note, progress, or email data to Douyin.
- Do not change button placement, styling, learning behavior, authentication, synchronization, sharing, vocabulary, Cloudflare DNS, or Supabase configuration.
- Keep `js/app.js?v=9`; version only the changed Douyin module to `v2` and the PWA cache to `wbm-cache-v10`.

---

### Task 1: Implement and test device-aware launch routing

**Files:**
- Modify: `tests/douyin-search-contract.mjs`
- Modify: `js/douyin-search.mjs`

**Interfaces:**
- Add: `isMobileDouyinDevice(navigatorRef): boolean`.
- Extend: `openDouyinSearch(value, options?)` so `options.navigatorRef` may be injected in tests.
- Preserve: `normalizeDouyinWord`, `buildDouyinLinks`, the existing return shape, and `window.DouyinSearch` browser integration.

- [ ] **Step 1: Add failing device-classification contracts**

Import `isMobileDouyinDevice` in `tests/douyin-search-contract.mjs`, then add explicit positive and negative cases:

```js
import {
  buildDouyinLinks,
  isMobileDouyinDevice,
  normalizeDouyinWord,
  openDouyinSearch,
} from "../js/douyin-search.mjs";

assert.equal(isMobileDouyinDevice({ userAgentData: { mobile: true } }), true);
assert.equal(isMobileDouyinDevice({ userAgent: "Mozilla/5.0 (Linux; Android 14; SM-X710)" }), true);
assert.equal(isMobileDouyinDevice({ userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)" }), true);
assert.equal(isMobileDouyinDevice({
  userAgentData: { mobile: false },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  platform: "MacIntel",
  maxTouchPoints: 5,
}), true);
assert.equal(isMobileDouyinDevice({
  userAgentData: { mobile: false },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  platform: "Win32",
  maxTouchPoints: 10,
}), false);
assert.equal(isMobileDouyinDevice({ userAgent: "" }), false);
```

- [ ] **Step 2: Add failing desktop-launch contracts**

Add a desktop fake that records every possible side effect. Assert a successful popup opens the encoded web URL once, with the exact target and feature string, and performs no current-tab navigation, timer setup, or document-listener registration:

```js
const desktopEffects = { opens: [], navigations: [], timers: 0, listeners: 0 };
const desktopWindowRef = {
  open: (...args) => (desktopEffects.opens.push(args), {}),
  location: { assign: (url) => desktopEffects.navigations.push(url) },
  setTimeout: () => (desktopEffects.timers += 1),
};
const desktopDocumentRef = {
  addEventListener: () => (desktopEffects.listeners += 1),
};
const desktopNavigatorRef = {
  userAgentData: { mobile: false },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  platform: "Win32",
  maxTouchPoints: 0,
};

const desktopResult = openDouyinSearch("ice cream", {
  windowRef: desktopWindowRef,
  documentRef: desktopDocumentRef,
  navigatorRef: desktopNavigatorRef,
});
assert.equal(desktopResult.launched, true);
assert.deepEqual(desktopEffects.opens, [[
  "https://www.douyin.com/search/ice%20cream",
  "_blank",
  "noopener,noreferrer",
]]);
assert.deepEqual(desktopEffects.navigations, []);
assert.equal(desktopEffects.timers, 0);
assert.equal(desktopEffects.listeners, 0);
```

Add two more desktop cases. In the first, `open()` returns `null`; in the second, it throws. In both cases assert exactly one `location.assign("https://www.douyin.com/search/ambition")`, with no App-Scheme navigation, timer, or listener.

- [ ] **Step 3: Make existing mobile contracts explicit and add tablet coverage**

Pass a positive mobile navigator to the existing App-first and hidden-page tests:

```js
const androidTabletNavigatorRef = {
  userAgentData: { mobile: false },
  userAgent: "Mozilla/5.0 (Linux; Android 14; SM-X710)",
  platform: "Linux armv8l",
  maxTouchPoints: 5,
};

const result = openDouyinSearch("ambition", {
  windowRef,
  documentRef,
  navigatorRef: androidTabletNavigatorRef,
  fallbackDelay: 1500,
});
```

Keep the assertions that App Scheme navigation happens first, the timer delay is 1500 ms, the visible timer navigates to the web URL, and a `visibilitychange` to hidden cancels that fallback. Add a mobile fake whose App-Scheme `location.assign` throws only for `snssdk1128://`; assert it immediately assigns the web URL and removes the listener/timer. Keep the blank-word contract and assert that blank input produces no `open`, navigation, timer, listener, or navigator access.

- [ ] **Step 4: Verify RED**

Run:

```powershell
node tests/douyin-search-contract.mjs
```

Expected: fail because `js/douyin-search.mjs` does not export `isMobileDouyinDevice`; after adding only the import, no production code should have changed.

- [ ] **Step 5: Implement the minimal classifier**

Add this pure function after `buildDouyinLinks`:

```js
export function isMobileDouyinDevice(navigatorRef = {}) {
  if (navigatorRef?.userAgentData?.mobile === true) return true;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(String(navigatorRef?.userAgent ?? ""))) {
    return true;
  }
  return navigatorRef?.platform === "MacIntel"
    && Number(navigatorRef?.maxTouchPoints ?? 0) > 1;
}
```

The positive checks are intentionally ordered: `userAgentData.mobile === false` must not override an Android-tablet UA or the desktop-UA iPad heuristic.

- [ ] **Step 6: Add the synchronous desktop branch**

In `openDouyinSearch`, keep the blank-input return first. Resolve `windowRef` and `navigatorRef`, then branch before resolving `documentRef` or creating mobile fallback state:

```js
export function openDouyinSearch(value, options = {}) {
  const links = buildDouyinLinks(value);
  if (!links) return { launched: false };
  const windowRef = options.windowRef ?? window;
  const navigatorRef = options.navigatorRef
    ?? (typeof navigator !== "undefined" ? navigator : {});

  if (!isMobileDouyinDevice(navigatorRef)) {
    let opened = false;
    try {
      opened = Boolean(windowRef.open(
        links.webUrl,
        "_blank",
        "noopener,noreferrer",
      ));
    } catch {
      opened = false;
    }
    if (!opened) windowRef.location.assign(links.webUrl);
    return { launched: true, links };
  }

  const documentRef = options.documentRef ?? document;
  // Keep the existing mobile/tablet timer, visibility, Scheme, and fallback code unchanged.
}
```

Do not add `isMobileDouyinDevice` to `window.DouyinSearch`; pages only consume the existing `buildDouyinLinks` and `openDouyinSearch` globals, while tests import the classifier directly.

- [ ] **Step 7: Verify GREEN and all existing contracts**

Run:

```powershell
node tests/douyin-search-contract.mjs
Get-ChildItem tests -Filter '*.mjs' | Sort-Object Name | ForEach-Object {
  node $_.FullName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
node --check js/douyin-search.mjs
git diff --check
```

Expected: all seven contract files print their success messages, syntax check exits 0, and `git diff --check` prints nothing.

- [ ] **Step 8: Commit the behavior change**

Review `git diff -- tests/douyin-search-contract.mjs js/douyin-search.mjs`, then commit only these files:

```powershell
git add tests/douyin-search-contract.mjs js/douyin-search.mjs
git commit -m "feat: route desktop Douyin searches to web"
```

---

### Task 2: Version the PWA contract and document the routing policy

**Files:**
- Modify: `tests/static-contract.mjs`
- Modify: `index.html`
- Modify: `sw.js`
- Modify: `README.md`

**Interfaces:**
- Produce: `js/douyin-search.mjs?v=2` in HTML and the Service Worker precache.
- Produce: Service Worker cache `wbm-cache-v10`.
- Preserve: `js/app.js?v=9` in HTML and the Service Worker precache.

- [ ] **Step 1: Write the failing release/static contract**

Read `README.md` in `tests/static-contract.mjs` and change the version assertions to require the approved release metadata:

```js
const readme = read("README.md");

assert.match(html, /<script type="module" src="js\/douyin-search\.mjs\?v=2"><\/script>/);
assert.match(html, /<script src=["']js\/app\.js\?v=9["']><\/script>/);
assert.match(sw, /const CACHE = "wbm-cache-v10"/);
for (const asset of ["./js/app.js?v=9", "./js/douyin-search.mjs?v=2"]) {
  assert.ok(sw.includes(JSON.stringify(asset)), `service worker missing ${asset}`);
}
assert.match(readme, /电脑端[\s\S]*新标签页[\s\S]*抖音网页版/);
assert.match(readme, /手机和平板[\s\S]*先尝试打开抖音 App/);
```

Replace every old static-contract expectation for `douyin-search.mjs?v=1` and `wbm-cache-v9`; do not leave assertions that accept both old and new versions.

- [ ] **Step 2: Verify RED**

Run:

```powershell
node tests/static-contract.mjs
```

Expected: fail on the still-current module/cache version before `index.html`, `sw.js`, or `README.md` is changed.

- [ ] **Step 3: Apply the HTML and Service Worker version update**

Make these exact substitutions:

```html
<script type="module" src="js/douyin-search.mjs?v=2"></script>
<script src="js/app.js?v=9"></script>
```

```js
const CACHE = "wbm-cache-v10";
// ASSETS continues to include "./js/app.js?v=9"
// Replace only the Douyin entry with "./js/douyin-search.mjs?v=2"
```

Do not change the underlying module filename or the app-bundle version.

- [ ] **Step 4: Update the README behavior statement**

Replace the current all-device App-first wording with one concise statement that records both branches and the existing Scheme caveat:

```md
- **抖音搜索**：沉浸学习、记忆卡片、遮罩记忆、测试（答案揭晓后）、收藏夹和妙计手账中的 🎵 会用当前单词的**完整原词**搜索抖音。电脑端会直接在新标签页打开抖音网页版；手机和平板会先尝试打开抖音 App，仅当页面在约 1500 ms 后仍保持可见时才回退到网页版，页面变为隐藏时会取消自动回退。App 优先使用的 `snssdk1128://` 自定义 Scheme 并非抖音公开保证的官方接口，可能随抖音客户端或浏览器策略变化而失效。
```

- [ ] **Step 5: Verify the versioned release locally**

Run:

```powershell
Get-ChildItem tests -Filter '*.mjs' | Sort-Object Name | ForEach-Object {
  node $_.FullName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
node --check js/app.js
node --check js/douyin-search.mjs
node --check js/share-rows.mjs
node --check js/sync-policy.mjs
node --check sw.js
git diff --check
```

Expected: all seven contracts pass, all syntax checks exit 0, and the diff check is clean.

- [ ] **Step 6: Perform a local browser smoke check**

Load the `browser:control-in-app-browser` skill before interactive browser testing. Serve the repository over local HTTP and inspect the loaded page without submitting account data. Confirm:

- HTML requests `js/douyin-search.mjs?v=2` and `js/app.js?v=9`.
- A large Douyin button and a compact Douyin button still render in their existing positions.
- The console has no module or Service Worker syntax error.
- Desktop routing is demonstrated with a disposable `window.open` interception or the contract harness, so the smoke check does not accidentally send extra vocabulary or account state to a third party.

- [ ] **Step 7: Commit the release metadata**

Review the four-file diff, then commit:

```powershell
git add tests/static-contract.mjs index.html sw.js README.md
git commit -m "docs: release desktop Douyin web routing"
```

---

### Task 3: Verify, package, publish, and prove the exact release

**Files:**
- Verify only: all tracked source and contract files
- Package only: the 20 production files listed below
- External state: Cloudflare Pages project `cijianmiaoji`; GitHub repository `lpvus/cijianmiaoji`, branch `main`

**Interfaces:**
- Produce: one Cloudflare Pages production deployment from the exact local release commit.
- Produce: the same exact release commit on GitHub `main`.
- Preserve: no legacy domain in production HTML or app source.

- [ ] **Step 1: Run the final verification from a clean commit**

Run the full contract and syntax suite again after Task 2 is committed:

```powershell
Get-ChildItem tests -Filter '*.mjs' | Sort-Object Name | ForEach-Object {
  node $_.FullName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
node --check js/app.js
node --check js/douyin-search.mjs
node --check js/share-rows.mjs
node --check js/sync-policy.mjs
node --check js/supabase-config.js
node --check sw.js
git diff --check
git status --short
```

Expected: all seven contracts pass; syntax and diff checks exit 0; `git status --short` prints nothing.

- [ ] **Step 2: Record and inspect the release commit**

Run:

```powershell
git rev-parse HEAD
git log -3 --oneline
git show --stat --oneline HEAD~1..HEAD
```

Record the full `HEAD` SHA for both Cloudflare deployment metadata and the final GitHub equality check. Confirm the two implementation commits include only the intended code, tests, PWA metadata, and README changes.

- [ ] **Step 3: Build the exact 20-file static artifact**

Create a new temporary directory and copy only these relative paths, preserving their directory structure:

```text
index.html
css/style.css
icons/icon-192.png
icons/icon-512.png
js/app.js
js/book-notes.js
js/douyin-search.mjs
js/node-async_hooks.mjs
js/node-buffer.mjs
js/node-events.mjs
js/node-process.mjs
js/node-tty.mjs
js/share-rows.mjs
js/supabase-config.js
js/supabase-js.bundle.mjs
js/supabase-js.mjs
js/sync-policy.mjs
js/words.js
manifest.webmanifest
sw.js
```

Assert the artifact contains exactly 20 files. Reject the package if it contains `.git`, `.superpowers`, `docs`, `tests`, `supabase`, local logs, test credentials, or tokens. Run the static contract before packaging and copy from the recorded clean commit only.

- [ ] **Step 4: Pause for final publishing confirmation**

Report the passing verification, release SHA, and exact 20-file package to the user. Obtain explicit confirmation immediately before changing Cloudflare or GitHub external state. Do not rebuild from a different commit after confirmation.

- [ ] **Step 5: Deploy the artifact to Cloudflare Pages**

Load `cloudflare:cloudflare` and `cloudflare:wrangler` before Cloudflare operations. Deploy the exact artifact as a production deployment to project `cijianmiaoji`, branch `main`, with the recorded release SHA. If the established direct-upload API path is used, hash assets with the Cloudflare Pages BLAKE3 protocol, register the hashes, upload only missing assets, confirm the missing-assets check is empty, and then create the deployment.

Record the deployment ID and the unique deployment URL returned by Cloudflare. Do not modify DNS, custom domains, Supabase configuration, or any other Cloudflare project.

- [ ] **Step 6: Verify the production deployment**

Fresh, cache-bypassing requests must return HTTP 200 for:

```text
https://cijianmiaoji.pages.dev/
https://cijianmiaoji.pages.dev/sw.js
https://cijianmiaoji.pages.dev/manifest.webmanifest
https://cijianmiaoji.pages.dev/js/douyin-search.mjs?v=2
```

Inspect the returned content and assert:

- HTML loads `js/douyin-search.mjs?v=2` and still loads `js/app.js?v=9`.
- Service Worker declares `wbm-cache-v10` and precaches the module `v2` asset.
- Neither `index.html` nor `js/app.js` contains `cijianmiaoji.netlify.app` or `001100.dpdns.org`.
- The production module exports the desktop classifier and calls `window.open` with `_blank` and `noopener,noreferrer`.

Load `browser:control-in-app-browser` for the final interactive check. On a desktop browser, click a Douyin button for a non-sensitive test word such as `ambition`; confirm a new tab opens at `https://www.douyin.com/search/ambition`, the original learning page remains open, and there is no `snssdk1128://` navigation attempt. Confirm one existing compact button still renders. Mobile/tablet behavior is proven by the deterministic contract unless a real mobile test device is already available.

- [ ] **Step 7: Push the exact release to GitHub and prove equality**

Push the recorded release commit to `origin/main`, then run:

```powershell
$localSha = git rev-parse HEAD
$remoteSha = (git ls-remote origin refs/heads/main).Split()[0]
if ($localSha -ne $remoteSha) { throw "GitHub main does not match the deployed release" }
git status --short
```

Expected: local and remote SHAs are identical and the worktree remains clean.

- [ ] **Step 8: Deliver release evidence**

Report the release commit, GitHub repository URL, Cloudflare deployment ID, unique deployment URL, canonical site URL, passing contract count, and the desktop/mobile routing result. Mention that the desktop popup-blocker fallback navigates in the same tab and that no DNS or Supabase settings were changed.
