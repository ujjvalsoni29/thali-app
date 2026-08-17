#!/usr/bin/env node
/**
 * npm run db:backup — copy the local D1 SQLite file to backups/ with a timestamp.
 *
 * Thali is local-only, so `.wrangler/state/` IS the database. It is gitignored (correctly —
 * it's local state, not source), which means git is not a backup and never will be. A stray
 * `rm -rf .wrangler`, a "clean reinstall", or a wrangler version that reorganises its state
 * directory would take the family's meal history with it. Unlike Maximus's credits, those
 * cannot be reconstructed from a statement.
 *
 * Run this before anything that touches .wrangler/, and once in a while regardless.
 * backups/ is gitignored too — copy them somewhere off this machine if they matter.
 */

import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE = join(APP, ".wrangler", "state");
const OUT = join(APP, "backups");
const KEEP = 20;

if (!existsSync(STATE)) {
  console.error(`no local D1 state at ${STATE}\nRun \`npm run db:migrate:local\` first.`);
  process.exit(1);
}

/**
 * wrangler has moved this path between versions, so find the file rather than assume it.
 *
 * `.wrangler/state/` holds more than the app database: Miniflare also keeps its HTTP cache
 * and Durable Object bookkeeping there, each as a file literally named `metadata.sqlite`.
 * That name is reserved for bookkeeping, not data — the actual D1 content lives in a
 * sibling file named after the database's id/hash — so it is excluded here on sight,
 * confirmed against this app's own `.wrangler/state/` on 2026-08-17.
 */
function findSqlite(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) findSqlite(full, found);
    else if (entry.endsWith(".sqlite") && entry !== "metadata.sqlite") found.push(full);
  }
  return found;
}

const files = findSqlite(STATE);
if (files.length === 0) {
  console.error(`no .sqlite file under ${STATE}. Run \`npm run db:migrate:local\` first.`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

/** Minute-resolution timestamp: thali-YYYY-MM-DD-HHmm.sqlite. Two backups inside the same
 *  minute overwrite each other — an accepted edge case for a script meant to be run
 *  occasionally, not in a loop. */
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

// This app binds a single D1 database, so `files` is normally exactly one entry and the
// clean `thali-<stamp>.sqlite` name applies. If more than one ever turns up in the same
// run (e.g. a second database bound later), number them so one run can't silently
// overwrite itself before pruning even runs.
for (const [i, file] of files.entries()) {
  const target = join(OUT, files.length === 1 ? `thali-${stamp}.sqlite` : `thali-${stamp}-${i + 1}.sqlite`);
  copyFileSync(file, target);
  console.log(`backed up  ${target}  (${(statSync(target).size / 1024).toFixed(1)} KB)`);
}

console.log(`\n${files.length} file(s) copied to backups/. That folder is gitignored — move a copy off this machine if the history matters.`);

// --- prune to the most recent 20 -------------------------------------------
const backups = readdirSync(OUT)
  .filter((name) => name.startsWith("thali-") && name.endsWith(".sqlite"))
  .sort();

const stale = backups.slice(0, Math.max(0, backups.length - KEEP));
for (const name of stale) {
  unlinkSync(join(OUT, name));
  console.log(`pruned     ${join(OUT, name)}`);
}

if (backups.length > KEEP) {
  console.log(`\nkept the most recent ${KEEP} backups, pruned ${stale.length}.`);
}
