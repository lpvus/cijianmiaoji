# Cloudflare Entry Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every production Netlify/DPDNS website-entry prompt with the single Cloudflare Pages canonical URL.

**Architecture:** Keep the existing footer and website-entry dialog structure, but reduce both to one canonical link. Remove hostname-dependent main/backup labeling because this deployment has one supported public origin.

**Tech Stack:** Static HTML, browser JavaScript, Node.js contract tests, Cloudflare Pages direct upload.

**Spec:** `docs/superpowers/specs/2026-08-16-cloudflare-entry-domain-design.md`

## Global Constraints

- Canonical URL is exactly `https://cijianmiaoji.pages.dev`.
- Production code must not contain `cijianmiaoji.netlify.app` or `001100.dpdns.org`.
- Do not change learning, Supabase, sharing, PWA, or vocabulary behavior.

---

### Task 1: Replace website-entry prompts and publish

**Files:**
- Modify: `tests/static-contract.mjs`
- Modify: `index.html`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `index.html` elements `#about-current-site` and existing footer markup.
- Produces: one visible canonical Cloudflare Pages link and fixed current-main-site text.

- [ ] **Step 1: Write the failing contract**

Add assertions to `tests/static-contract.mjs` that `index.html` contains `https://cijianmiaoji.pages.dev`, that production HTML and JavaScript contain neither legacy domain, and that `js/app.js` no longer branches on `dpdns.org`.

- [ ] **Step 2: Run the contract and verify RED**

Run: `node tests/static-contract.mjs`

Expected: failure because the Cloudflare URL is absent and legacy domains remain.

- [ ] **Step 3: Implement the minimal markup and logic change**

In `index.html`, replace the footer links with one Cloudflare “主站” link and replace the dialog's two site paragraphs with one Cloudflare main-site paragraph. In `js/app.js`, set `#about-current-site` to `你当前正在访问主站。` without reading `location.hostname`.

- [ ] **Step 4: Verify GREEN and regressions**

Run all `tests/*.mjs`, run `node --check js/app.js`, and scan production files for both legacy domains. Expected: all pass and no legacy-domain matches outside documentation.

- [ ] **Step 5: Commit and deploy**

Commit `index.html`, `js/app.js`, and `tests/static-contract.mjs`. Create a clean production package from that commit, direct-upload it to Cloudflare Pages project `cijianmiaoji`, and verify `/`, `/sw.js`, and `/manifest.webmanifest` return HTTP 200. Confirm the live HTML contains the canonical URL and no legacy domains.
