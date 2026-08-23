import assert from "node:assert/strict";
import {
  buildDouyinLinks,
  isMobileDouyinDevice,
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

for (const open of [() => null, () => { throw new Error("blocked"); }]) {
  const effects = { navigations: [], timers: 0, listeners: 0 };
  const windowRef = {
    open,
    location: { assign: (url) => effects.navigations.push(url) },
    setTimeout: () => (effects.timers += 1),
  };
  const documentRef = { addEventListener: () => (effects.listeners += 1) };
  const result = openDouyinSearch("ambition", {
    windowRef,
    documentRef,
    navigatorRef: desktopNavigatorRef,
  });
  assert.equal(result.launched, true);
  assert.deepEqual(effects.navigations, ["https://www.douyin.com/search/ambition"]);
  assert.equal(effects.timers, 0);
  assert.equal(effects.listeners, 0);
}

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
assert.equal(result.launched, true);
assert.deepEqual(navigations, ["snssdk1128://search?keyword=ambition"]);
assert.equal(timers[0].delay, 1500);
timers[0].fn();
assert.deepEqual(navigations, [
  "snssdk1128://search?keyword=ambition",
  "https://www.douyin.com/search/ambition",
]);

const hiddenNavigations = [];
const hiddenTimers = [];
const hiddenListeners = new Map();
const hiddenWindowRef = {
  location: { assign: (url) => hiddenNavigations.push(url) },
  setTimeout: (fn, delay) => (hiddenTimers.push({ fn, delay }), hiddenTimers.length),
  clearTimeout: () => {},
};
const hiddenDocumentRef = {
  hidden: false,
  addEventListener: (name, fn) => hiddenListeners.set(name, fn),
  removeEventListener: (name) => hiddenListeners.delete(name),
};
openDouyinSearch("ambition", {
  windowRef: hiddenWindowRef,
  documentRef: hiddenDocumentRef,
  navigatorRef: androidTabletNavigatorRef,
});
hiddenDocumentRef.hidden = true;
hiddenListeners.get("visibilitychange")();
hiddenTimers[0].fn();
assert.deepEqual(hiddenNavigations, ["snssdk1128://search?keyword=ambition"]);

const throwingNavigations = [];
const throwingListeners = new Map();
const throwingTimers = [];
let throwingClears = 0;
const throwingWindowRef = {
  location: {
    assign: (url) => {
      throwingNavigations.push(url);
      if (url.startsWith("snssdk1128://")) throw new Error("app unavailable");
    },
  },
  setTimeout: (fn, delay) => (throwingTimers.push({ fn, delay }), throwingTimers.length),
  clearTimeout: () => (throwingClears += 1),
};
const throwingDocumentRef = {
  hidden: false,
  addEventListener: (name, fn) => throwingListeners.set(name, fn),
  removeEventListener: (name) => throwingListeners.delete(name),
};
openDouyinSearch("ambition", {
  windowRef: throwingWindowRef,
  documentRef: throwingDocumentRef,
  navigatorRef: androidTabletNavigatorRef,
});
assert.deepEqual(throwingNavigations, [
  "snssdk1128://search?keyword=ambition",
  "https://www.douyin.com/search/ambition",
]);
assert.equal(throwingListeners.size, 0);
assert.equal(throwingTimers.length, 1);
assert.equal(throwingClears, 1);

const emptyNavigations = [];
const emptyWindowRef = { location: { assign: (url) => emptyNavigations.push(url) } };
let navigatorAccessed = false;
const emptyOptions = {
  windowRef: emptyWindowRef,
  get navigatorRef() {
    navigatorAccessed = true;
    return desktopNavigatorRef;
  },
};
assert.deepEqual(openDouyinSearch("  ", emptyOptions), { launched: false });
assert.deepEqual(emptyNavigations, []);
assert.equal(navigatorAccessed, false);

console.log("douyin search contract passed");
