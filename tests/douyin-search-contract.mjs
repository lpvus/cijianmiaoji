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
openDouyinSearch("ambition", { windowRef: hiddenWindowRef, documentRef: hiddenDocumentRef });
hiddenDocumentRef.hidden = true;
hiddenListeners.get("visibilitychange")();
hiddenTimers[0].fn();
assert.deepEqual(hiddenNavigations, ["snssdk1128://search?keyword=ambition"]);

const emptyNavigations = [];
const emptyWindowRef = { location: { assign: (url) => emptyNavigations.push(url) } };
assert.deepEqual(openDouyinSearch("  ", { windowRef: emptyWindowRef }), { launched: false });
assert.deepEqual(emptyNavigations, []);

console.log("douyin search contract passed");
