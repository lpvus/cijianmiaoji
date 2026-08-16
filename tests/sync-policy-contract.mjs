import assert from "node:assert/strict";

import { canStartSync } from "../js/sync-policy.mjs";

const configured = { url: "https://example.supabase.co", key: "publishable-key" };

assert.equal(canStartSync({ online: false, config: configured }), false, "offline must block Supabase sync");
assert.equal(canStartSync({ online: true, config: configured }), true, "online with config must allow sync");
assert.equal(canStartSync({ online: true, config: null }), false, "missing config must block sync");

console.log("sync policy contract passed");
