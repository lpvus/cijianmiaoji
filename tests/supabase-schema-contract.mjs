import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8").toLowerCase();
for (const table of ["user_data", "note_shares", "feedback"]) {
  assert.match(sql, new RegExp(`create table if not exists\\s+public\\.${table}\\b`));
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
}
assert.match(sql, /unique\s*\(user_id,\s*note_id\)/);
assert.match(sql, /create or replace function public\.toggle_share_like/);
assert.match(sql, /auth\.uid\(\)/);
console.log("supabase schema contract passed");
