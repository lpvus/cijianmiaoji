import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8").toLowerCase();
const compactSql = sql.replace(/\s+/g, " ");
for (const table of ["user_data", "note_shares", "feedback"]) {
  assert.match(sql, new RegExp(`create table if not exists\\s+public\\.${table}\\b`));
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
}
assert.match(sql, /unique\s*\(user_id,\s*note_id\)/);

for (const [pattern, message] of [
  [/create policy "users manage own data" on public\.user_data for all to authenticated using \(auth\.uid\(\)::text = id\) with check \(auth\.uid\(\)::text = id\);/, "user_data must remain owner-only"],
  [/create policy "authenticated users read shared notes" on public\.note_shares for select to authenticated using \(true\);/, "authenticated users must be able to read shared notes"],
  [/create policy "users create own shared notes" on public\.note_shares for insert to authenticated with check \(auth\.uid\(\) = user_id\);/, "users must only insert their own shared notes"],
  [/create policy "users update own shared notes" on public\.note_shares for update to authenticated using \(auth\.uid\(\) = user_id\) with check \(auth\.uid\(\) = user_id\);/, "users must only update their own shared notes"],
  [/create policy "users delete own shared notes" on public\.note_shares for delete to authenticated using \(auth\.uid\(\) = user_id\);/, "users must only delete their own shared notes"],
  [/create policy "users submit own feedback" on public\.feedback for insert to authenticated with check \(auth\.uid\(\) = user_id\);/, "users must only submit their own feedback"],
]) {
  assert.match(compactSql, pattern, message);
}

const functionMatch = sql.match(/create or replace function public\.toggle_share_like[\s\S]*?\$\$;/);
assert.ok(functionMatch, "toggle_share_like function is required");
const toggleFunction = functionMatch[0].replace(/\s+/g, " ");
assert.match(toggleFunction, /security definer/, "toggle_share_like must be SECURITY DEFINER");
assert.match(toggleFunction, /set search_path = ''/, "toggle_share_like must use an empty search_path");
assert.match(toggleFunction, /if not coalesce\(auth\.uid\(\) = p_user_id, false\) then/, "toggle_share_like must reject missing or forged user IDs");
assert.match(compactSql, /revoke all on function public\.toggle_share_like\(uuid, uuid\) from [^;]*public[^;]*anon[^;]*;/, "public and anon must not execute toggle_share_like");
assert.match(compactSql, /grant execute on function public\.toggle_share_like\(uuid, uuid\) to authenticated;/, "authenticated users must be able to execute toggle_share_like");
assert.doesNotMatch(compactSql, /grant execute on function public\.toggle_share_like\(uuid, uuid\) to (?:public|anon);/, "toggle_share_like must not be granted back to public or anon");

assert.match(compactSql, /grant insert \(user_id, note_id, word_key, text\) on table public\.note_shares to authenticated;/, "note share inserts must use column privileges without likes");
assert.match(compactSql, /grant update \(user_id, note_id, word_key, text\) on table public\.note_shares to authenticated;/, "note share upserts must use column privileges without likes");
const noteShareGrants = compactSql.match(/grant [^;]+ on (?:table )?public\.note_shares to authenticated;/g) || [];
for (const grant of noteShareGrants) {
  assert.doesNotMatch(grant, /\binsert(?:\s*,|\s+on\b)/, "note_shares must not have table-level INSERT privileges");
  assert.doesNotMatch(grant, /\bupdate(?:\s*,|\s+on\b)/, "note_shares must not have table-level UPDATE privileges");
  if (/\b(?:insert|update)\s*\(/.test(grant)) {
    assert.doesNotMatch(grant, /\blikes\b/, "likes must only be writable through toggle_share_like");
  }
}

assert.match(compactSql, /pg_get_serial_sequence\('public\.feedback', 'id'\)/, "feedback sequence grants must resolve the actual identity sequence");
assert.doesNotMatch(compactSql, /on sequence public\.feedback_id_seq/, "feedback sequence grants must not assume a generated sequence name");
console.log("supabase schema contract passed");
