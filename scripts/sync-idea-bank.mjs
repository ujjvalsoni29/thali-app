#!/usr/bin/env node
/**
 * npm run sync:ideabank — regenerate `public/thali-idea-bank.html` from `../Main/thali-idea-bank.html`.
 *
 * WHY THIS FILE EXISTS. The idea bank is a companion shelf that lives in `Main/` and opens
 * off `file://` like the mockup does (MASTER.md). `Main/` is deliberately outside version
 * control and outside the Vite root (CLAUDE.md §10), so the dev server and the Worker can
 * never serve it. For nine steps the masthead linked at `../Main/thali-idea-bank.html`,
 * which under `file://` walked up a directory and under `http://localhost:5473` collapsed
 * to `/Main/thali-idea-bank.html`, hit the SPA fallback, and booted the app into a route
 * `App.tsx` does not define — a blank page. Manc found it, not a check.
 *
 * So the served copy is a BUILD ARTIFACT of the `Main/` original, not a second original.
 * `Main/` stays the one place a human edits. Exactly two things differ, and only because
 * `file://` and `http://` disagree about what a path means:
 *
 *   - the two "the board" links, which pointed at the mockup and now point at the running
 *     app — under `file://` the mockup IS the board, under http:// the app is;
 *   - the favicon, which `../favicon.svg` reaches from `Main/` but not from the web root.
 *
 * Check 11 in `check.mjs` re-applies this exact table and fails the build if the result
 * does not match what is on disk, so the copy cannot silently rot the way the old link did.
 * Edit `Main/thali-idea-bank.html`, run this, commit the result.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");

export const SOURCE = join(APP, "..", "Main", "thali-idea-bank.html");
export const SERVED = join(APP, "public", "thali-idea-bank.html");

/**
 * The only differences allowed between the two copies. Order matters: the favicon rule
 * must not also match the board rule's output. Each `find` is a plain string, replaced
 * globally — no regex, so nothing here can quietly match more than it says it does.
 */
export const REWRITES = [
  { find: 'href="thali-mockup.html"', replace: 'href="/"', why: "the board is the running app now, not the mockup" },
  { find: 'href="../favicon.svg"', replace: 'href="/favicon.svg"', why: "public/ is the web root; there is no parent to walk up to" },
];

/** Apply the rewrite table. Pure — the check imports this and compares, it does not write. */
export function toServed(source) {
  return REWRITES.reduce((text, { find, replace }) => text.split(find).join(replace), source);
}

// Only write when run directly, so `check.mjs` can import the table without side effects.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!existsSync(SOURCE)) {
    console.error(`sync:ideabank  ${SOURCE} is missing — Main/ is outside version control, so a fresh clone will not have it.`);
    process.exit(1);
  }
  writeFileSync(SERVED, toServed(readFileSync(SOURCE, "utf8")));
  console.log("sync:ideabank  public/thali-idea-bank.html regenerated from Main/thali-idea-bank.html");
}
