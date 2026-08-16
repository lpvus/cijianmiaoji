import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8").replace(/\s+/g, " ");

function assertContract(pattern, message) {
  assert.ok(pattern.test(app), message);
}

assertContract(
  /const \{ error: (\w+) \} = await sb\.from\("note_shares"\)\.delete\(\)\.eq\("user_id", uid\); if \(\1\) throw \1;/,
  "disabling sharing must throw a returned delete error"
);
assertContract(
  /const \{ data: existing, error: (\w+) \} = await sb\.from\("note_shares"\)\.select\("note_id"\)\.eq\("user_id", uid\); if \(\1\) throw \1;/,
  "loading existing shares must throw a returned select error"
);
assertContract(
  /const \{ error: (\w+) \} = await sb\.from\("note_shares"\)\.delete\(\)\.eq\("user_id", uid\)\.in\("note_id", del\); if \(\1\) throw \1;/,
  "removing stale shares must throw a returned delete error"
);
assertContract(
  /const \{ error: (\w+) \} = await sb\.from\("note_shares"\)\.upsert\(rows, \{ onConflict: "user_id,note_id" \}\); if \(\1\) throw \1;/,
  "upserting shares must throw a returned error"
);
assertContract(
  /const \{ error: (\w+) \} = await sb\.rpc\("toggle_share_like", \{ p_share_id: b\.dataset\.id, p_user_id: uid \}\); if \(\1\) throw \1;/,
  "toggling a like must throw a returned RPC error"
);

console.log("supabase client error contract passed");
