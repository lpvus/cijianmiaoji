import assert from "node:assert/strict";

import { buildShareRows } from "../js/share-rows.mjs";

const notes = {
  "1:ambition": {
    items: [
      { id: "b1ambition", t: "预置书中妙计", at: 0 },
      { id: "n-test", t: "Task 4 用户妙计", at: 1786863610114 },
    ],
    cur: 1,
  },
  "1:action": {
    items: [{ id: "b1action", t: "另一条预置妙计", at: 0 }],
    cur: 0,
  },
};

assert.deepEqual(buildShareRows(notes, "test-user", () => "fixture-hash"), [
  {
    note_id: "hfixture-hash",
    word_key: "1:ambition",
    text: "Task 4 用户妙计",
    user_id: "test-user",
  },
]);

console.log("share rows contract passed");
