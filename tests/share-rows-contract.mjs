import assert from "node:assert/strict";

import { buildShareRows } from "../js/share-rows.mjs";

const notes = {
  "1:ambition": {
    items: [
      { id: "b1ambition", t: "预置书中妙计", at: 0 },
      { id: "olegacy", t: "旧格式用户妙计", at: 0 },
      { id: "n-modern", t: "现代用户妙计", at: 1786863610114 },
      { id: "b1edited", t: "用户编辑过的预置妙计", at: 1786863610115 },
    ],
    cur: 2,
  },
  "1:action": {
    items: [{ id: "b1action", t: "另一条预置妙计", at: 0 }],
    cur: 0,
  },
};

const textHash = (value) => value.slice(value.indexOf("::") + 2);

assert.deepEqual(buildShareRows(notes, "test-user", textHash), [
  {
    note_id: "h旧格式用户妙计",
    word_key: "1:ambition",
    text: "旧格式用户妙计",
    user_id: "test-user",
  },
  {
    note_id: "h现代用户妙计",
    word_key: "1:ambition",
    text: "现代用户妙计",
    user_id: "test-user",
  },
  {
    note_id: "h用户编辑过的预置妙计",
    word_key: "1:ambition",
    text: "用户编辑过的预置妙计",
    user_id: "test-user",
  },
]);

console.log("share rows contract passed");
