import assert from "node:assert/strict";

import { buildShareRows } from "../js/share-rows.mjs";

const notes = {
  "1:ambition": {
    items: [
      { id: "b1ambition", t: "预置书中妙计", at: 0 },
      { id: "old-imported-book", t: "预置书中妙计", at: 0 },
      { id: "oimported-book", t: "预置书中妙计", at: 0 },
      { id: "olegacy-user", t: "旧格式用户妙计", at: 0 },
      { id: "old-user", t: "另一条旧格式用户妙计", at: 0 },
      { id: "b-not-book-text", t: "b 前缀但不是预置文本", at: 0 },
      { id: "n-modern", t: "现代用户妙计", at: 1786863610114 },
      { id: "b1edited", t: "预置书中妙计", at: 1786863610115 },
    ],
    cur: 6,
  },
  "1:action": {
    items: [{ id: "b1action", t: "另一条预置妙计", at: 0 }],
    cur: 0,
  },
};
const bookNotes = { "1:ambition": "预置书中妙计", "1:action": "另一条预置妙计" };

const textHash = (value) => value.slice(value.indexOf("::") + 2);

assert.deepEqual(buildShareRows(notes, "test-user", textHash, bookNotes), [
  {
    note_id: "h旧格式用户妙计",
    word_key: "1:ambition",
    text: "旧格式用户妙计",
    user_id: "test-user",
  },
  {
    note_id: "h另一条旧格式用户妙计",
    word_key: "1:ambition",
    text: "另一条旧格式用户妙计",
    user_id: "test-user",
  },
  {
    note_id: "h现代用户妙计",
    word_key: "1:ambition",
    text: "现代用户妙计",
    user_id: "test-user",
  },
  {
    note_id: "h预置书中妙计",
    word_key: "1:ambition",
    text: "预置书中妙计",
    user_id: "test-user",
  },
]);

console.log("share rows contract passed");
