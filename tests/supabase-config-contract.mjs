import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../js/supabase-config.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);
const config = context.window.SUPABASE_CONFIG;
assert.match(config.url, /^https:\/\/[a-z0-9]+\.supabase\.co$/);
assert.ok(config.key.length >= 40);
assert.ok(!config.url.includes("fxtyvroaxlzdkhyjnwgd"), "original project is still configured");
console.log("supabase config contract passed");
