#!/usr/bin/env node
/**
 * npm run check — the mechanical gate.
 *
 * THIS IS NOT A TEST SUITE. There are no tests in Thali (plan §B) and this is not a
 * revival of Pulse's `curls/` folder. Checks 1–10 below are ported VERBATIM from
 * `maximus-app/scripts/check.mjs` (step-02 §1) — every one of them is scar tissue from a
 * real incident on Pulse, Keystone or Maximus, written down in prose there, broken anyway,
 * and turned into one command that fails. Checks T1–T4 are new: Thali's three design rules
 * from plan §A5a, which failed as prose TWICE (the mono/letterspaced-uppercase Keystone
 * copy in review round 2) before this file existed to make them mechanical.
 *
 * Uses only the Node standard library, so it runs BEFORE `npm install`.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(APP, "..");

const failures = [];
const notes = [];
const fail = (check, where, msg) => failures.push({ check, where, msg });

// --- helpers ---------------------------------------------------------------

const SKIP_DIRS = new Set(["node_modules", ".git", ".wrangler", ".idea", "dist"]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  // Never let an unreadable directory turn a rule violation into a stack trace — a
  // checker that crashes is a checker people stop running.
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    notes.push(`skipped unreadable directory: ${dir}`);
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const rel = (p) => relative(ROOT, p);
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/**
 * Blank out comments while preserving byte offsets, so reported line numbers stay true.
 * Line comments must be at the start of a line so `https://` survives.
 */
const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^([ \t]*)\/\/[^\n]*/gm, (m) => m.replace(/[^\n]/g, " "))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));

/** Split on `sep` at paren-depth 0, so `var(--accent, var(--ink))` survives a space-split
 *  and `rgba(0,0,0,.3), var(--ink)` survives a comma-split. Used by the shadow check. */
function splitTopLevel(str, sep) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === sep && depth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts.map((s) => s.trim()).filter(Boolean);
}

const appFiles = walk(APP);
const rootFiles = walk(ROOT);

// --- 1. no raw hex colours in app code ------------------------------------
// Colour belongs in src/theme/tokens.css, never in a component. Keystone's rule, same grep.
for (const file of appFiles) {
  if (![".ts", ".tsx"].includes(extname(file))) continue;
  // Poster.tsx is the second legal home for raw hex, after tokens.css (tasks/step-11.md §1)
  // — its header comment documents the light-token override poster.css re-declares so the
  // printed sheet can never render in dark mode.
  if (basename(file) === "Poster.tsx") continue;
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    fail("raw-hex", `${rel(file)}:${lineOf(text, m.index)}`, `${m[0]} — colour belongs in src/theme/tokens.css, not a component`);
  }
}

// --- 2. no raw px in app code ---------------------------------------------
// Spacing and radii come from this project's CSS custom properties (--r, --r-sm, --bd,
// --off and friends in src/theme/tokens.css), never a literal in a component.
for (const file of appFiles) {
  if (extname(file) !== ".tsx") continue;
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/\b\d+(\.\d+)?px\b/g)) {
    fail("raw-px", `${rel(file)}:${lineOf(text, m.index)}`, `${m[0]} — spacing/radii belong in CSS using this project's design tokens, not a literal in .tsx`);
  }
}

// --- 3. font-family must end in a literal generic OUTSIDE any var() -------
// The single most expensive rule in project history: 39 declarations across 15 files
// in Keystone, and Pulse's first attempt at the fix (`var(--x, generic)`) was WRONG —
// WebStorm does not parse inside var(), so that form still fails Analyze Code and
// still blocks the commit.
const GENERICS = [
  "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui",
  "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "math", "emoji", "fangsong",
];
const endsInGeneric = (value) => {
  const last = value.split(",").pop().trim().replace(/["';]/g, "").toLowerCase();
  return GENERICS.includes(last);
};

// Thali bakes the generic INTO the token itself — `--display:'Anek Gujarati',...,sans-serif`
// in tokens.css — rather than appending it at every call site the way Maximus's
// `--font-sans` (names only) does. Both are valid CSS and both satisfy the WebStorm
// inspection; a bare `font-family: var(--display)` is fine as long as `--display`'s OWN
// definition ends in a literal generic. Build that lookup once so the loop below can
// resolve it instead of flagging every single usage of this project's font tokens.
const tokenDefs = new Map();
for (const file of appFiles) {
  if (extname(file) !== ".css") continue;
  const text = stripComments(readFileSync(file, "utf8"));
  for (const m of text.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    tokenDefs.set(m[1], m[2].trim());
  }
}

for (const file of appFiles) {
  if (![".css", ".ts", ".tsx"].includes(extname(file))) continue;
  // Strip comments first. This file and tokens.css both DOCUMENT the wrong form in a
  // comment, and a checker that flags its own documentation is a checker people disable.
  const raw = readFileSync(file, "utf8");
  const text = stripComments(raw);

  // The wrong form Pulse shipped first. Catch it explicitly so nobody "fixes" it back.
  for (const m of text.matchAll(/var\(\s*--[\w-]*font[\w-]*\s*,/g)) {
    fail(
      "font-family",
      `${rel(file)}:${lineOf(text, m.index)}`,
      "generic is inside the var() — WebStorm cannot see it there. Move it outside: var(--font-x), sans-serif",
    );
  }

  const declarations = [
    ...text.matchAll(/font-family\s*:\s*([^;}\n]+)/g),
    ...text.matchAll(/fontFamily\s*:\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/g),
  ];
  for (const m of declarations) {
    const value = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (!value || value.startsWith("inherit") || value.startsWith("initial") || value.startsWith("unset")) continue;
    if (endsInGeneric(value)) continue;

    // A bare `var(--token)` with no fallback at the call site is fine if the token's own
    // definition ends in a literal generic (this project's convention — see tokenDefs above).
    const bareVar = value.match(/^var\(\s*--([\w-]+)\s*\)$/);
    if (bareVar && tokenDefs.has(bareVar[1]) && endsInGeneric(tokenDefs.get(bareVar[1]))) continue;

    fail(
      "font-family",
      `${rel(file)}:${lineOf(text, m.index)}`,
      `"${value}" does not end in a literal generic keyword as its own comma item (directly, or via the token's own definition)`,
    );
  }
}

// --- 4. one top-level value per ```json fence in Markdown ------------------
// WebStorm lints fenced json in .md as strict JSON: two objects back to back is
// "JSON standard allows only one top-level value" and blocks the commit.
for (const file of rootFiles) {
  if (extname(file) !== ".md") continue;
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/```json\r?\n([\s\S]*?)```/g)) {
    try {
      JSON.parse(m[1]);
    } catch (error) {
      fail("json-fence", `${rel(file)}:${lineOf(text, m.index)}`, `fence is not exactly one JSON value (${error.message}). Split it into two fences.`);
    }
  }
}

// --- 5. no barrel files ---------------------------------------------------
// A barrel is what makes WebStorm's "Import can be shortened" fire. Keystone got
// away with it only because it happened to have none. Make that deliberate.
for (const file of appFiles) {
  if (["index.ts", "index.tsx"].includes(basename(file)) && rel(file).includes("/src/")) {
    fail("barrel", rel(file), "barrel files trigger WebStorm's 'Import can be shortened'. Import from the real module.");
  }
}

// --- 6. .gitignore must cover every byproduct that has ever been committed --
const REQUIRED_IGNORES = [
  "node_modules/",
  "dist*/",
  "storybook-*/",
  ".wrangler/",
  "*.tsbuildinfo",
  ".idea/",
  ".DS_Store",
  ".dev.vars",
  "backups/",
  "vite.config.*.timestamp-*.mjs",
  "worker-configuration.d.ts",
];
const gitignorePath = join(APP, ".gitignore");
if (!existsSync(gitignorePath)) {
  fail("gitignore", "thali-app/.gitignore", "MISSING ENTIRELY — restore it before any git operation");
} else {
  const lines = readFileSync(gitignorePath, "utf8").split("\n").map((l) => l.trim());
  for (const pattern of REQUIRED_IGNORES) {
    if (!lines.includes(pattern)) {
      fail("gitignore", "thali-app/.gitignore", `missing required pattern: ${pattern}`);
    }
  }
}

// --- 6a. the git root must have an ignore file AND a .git/info/exclude belt ----
// Inherited verbatim from Maximus, where on 2026-07-29 `maximus-app/.gitignore`
// disappeared from disk, `git add` swallowed `node_modules/`, and the first push died
// with `RPC failed; HTTP 400` — GitHub rejects any blob over 100 MB and
// `node_modules/.../workerd` is 115 MB.
//
// Two lessons, both encoded here:
//   1. Find the git root; don't assume it. It has already moved once, on Maximus.
//   2. A tracked `.gitignore` is a single point of failure BECAUSE it is an ordinary file
//      someone can delete. `.git/info/exclude` does the same job, is per-repo, is not
//      tracked, and survives the deletion of `.gitignore`. It is the actual belt.
function findGitRoot(from) {
  let dir = from;
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const GIT_ROOT = findGitRoot(APP);
if (!GIT_ROOT) {
  notes.push("no .git found at or above thali-app — skipping the git-hygiene checks");
} else {
  const where = rel(GIT_ROOT) || basename(GIT_ROOT);

  const rootIgnore = join(GIT_ROOT, ".gitignore");
  if (!existsSync(rootIgnore)) {
    fail("gitignore", `${where}/.gitignore`, "MISSING at the git root — `git add` would take node_modules");
  } else {
    const lines = readFileSync(rootIgnore, "utf8").split("\n").map((l) => l.trim());
    for (const pattern of ["node_modules/", "dist*/", ".wrangler/", "backups/", ".DS_Store"]) {
      if (!lines.some((l) => l === pattern || l === `**/${pattern}`)) {
        fail("gitignore", `${where}/.gitignore (git root)`, `missing required pattern: ${pattern}`);
      }
    }
  }

  const exclude = join(GIT_ROOT, ".git", "info", "exclude");
  const excludeText = existsSync(exclude) ? readFileSync(exclude, "utf8") : "";
  if (!/^\s*(\*\*\/)?node_modules\/?\s*$/m.test(excludeText)) {
    fail(
      "gitignore",
      `${where}/.git/info/exclude`,
      "no node_modules rule. This is the belt that survives .gitignore being deleted — the exact failure Maximus had. Fix:\n" +
        `      printf '\\nnode_modules/\\ndist*/\\n.wrangler/\\nbackups/\\n' >> "${join(GIT_ROOT, ".git", "info", "exclude")}"`,
    );
  }
}

// --- 6b. nothing enormous may sit in the tree unignored -------------------
// GitHub refuses any blob over 100 MB outright, so an oversized unignored file is not a
// style problem — it is a push that cannot succeed until history is rewritten.
const IGNORED_PREFIXES = ["node_modules/", ".wrangler/", "backups/", ".git/", "dist"];
const isCoveredByIgnore = (p) => IGNORED_PREFIXES.some((prefix) => p.includes(prefix));
for (const file of rootFiles) {
  const path = rel(file);
  if (isCoveredByIgnore(path)) continue;
  let size;
  try {
    size = statSync(file).size;
  } catch {
    continue;
  }
  if (size > 50 * 1024 * 1024) {
    fail("oversized", `${path} (${(size / 1024 / 1024).toFixed(0)} MB)`, "GitHub rejects blobs over 100 MB. Ignore it or move it out of the repo.");
  }
}

// --- 7. no stray build byproducts sitting in the tree ---------------------
// This mount cannot unlink, so a generated file that lands here STAYS here until
// Manc removes it. Catch it while it's one file, not 250 (Keystone's count).
for (const file of rootFiles) {
  const name = basename(file);
  if (/^vite\.config\..*\.timestamp-.*\.mjs$/.test(name)) {
    fail("byproduct", rel(file), "Vite throwaway config. Never commit it; ask Manc to delete it (this mount cannot rm).");
  }
  if (/^dist.+/.test(rel(file).split("/").find((s) => s.startsWith("dist")) ?? "")) {
    notes.push(`stray build dir in the repo: ${rel(file).split("/").slice(0, 2).join("/")} — build to /tmp instead (thali-app/CLAUDE.md §10)`);
  }
}

// --- 8. the agent contract must not drift between its two copies ----------
const claude = join(APP, "CLAUDE.md");
const agents = join(APP, "AGENTS.md");
if (!existsSync(claude) || !existsSync(agents)) {
  fail("contract", "thali-app", "CLAUDE.md and AGENTS.md must both exist");
} else if (readFileSync(claude, "utf8") !== readFileSync(agents, "utf8")) {
  fail("contract", "thali-app", "CLAUDE.md and AGENTS.md have diverged — they must be byte-identical");
}

// --- 9. workers.dev must stay disabled -----------------------------------
// The single security-relevant line in the whole config. There is no auth story for a
// hosted Thali at all (plan §B) — no Access, no login — so a live workers.dev URL would
// serve the family's meal plan to the open internet with nothing in front of it.
const wranglerPath = join(APP, "wrangler.jsonc");
if (existsSync(wranglerPath)) {
  const conf = readFileSync(wranglerPath, "utf8");
  if (!/"workers_dev"\s*:\s*false/.test(conf)) {
    fail("security", "thali-app/wrangler.jsonc", '"workers_dev": false is missing — the raw Worker URL would be reachable with no auth in front of it');
  }
}

// --- 10. tsconfig `types` must be backed by a declared dependency ---------
// Cost two of the three errors on Maximus's first typecheck: tsconfig.node.json asked for
// `types: ["node"]` while @types/node was never in package.json, so tsc failed with
// TS2688 "Cannot find type definition file for 'node'". A `types` entry is a silent
// dependency — nothing else in the repo references it — so nothing catches the omission.
const pkgPath = join(APP, "package.json");
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const declared = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);

  for (const file of readdirSync(APP)) {
    if (!/^tsconfig(\..+)?\.json$/.test(file)) continue;
    // Strip comments and trailing commas — tsconfigs are JSONC by convention.
    const text = stripComments(readFileSync(join(APP, file), "utf8")).replace(/,(\s*[}\]])/g, "$1");
    let conf;
    try {
      conf = JSON.parse(text);
    } catch (error) {
      fail("tsconfig", file, `does not parse: ${error.message}`);
      continue;
    }
    for (const entry of conf.compilerOptions?.types ?? []) {
      // "vite/client" -> vite · "@scope/pkg/sub" -> @scope/pkg · "node" -> node or @types/node
      const pkgName = entry.startsWith("@")
        ? entry.split("/").slice(0, 2).join("/")
        : entry.split("/")[0];
      // Only unscoped names have an @types/ counterpart worth suggesting.
      const typesName = pkgName.startsWith("@") ? null : `@types/${pkgName}`;
      if (!declared.has(pkgName) && !(typesName && declared.has(typesName))) {
        const wanted = typesName ? `"${pkgName}" nor "${typesName}"` : `"${pkgName}"`;
        fail("tsconfig", `${file} → types: ["${entry}"]`, `neither ${wanted} is in package.json`);
      }
    }
  }
}

// ============================================================================
// THALI-SPECIFIC RULES — plan §A5a failed as prose TWICE (v1.1 copied Keystone's mono
// micro-labels and 3px radii; the "no monospace / no letterspaced uppercase" corollary
// still needed a review round 2 rebuild). These four make it mechanical (step-02 §2d).
// ============================================================================

// --- T1. no monospace anywhere ---------------------------------------------
// Concretely forbidden by name (plan §A5a, Thali_Master.md § Design System): Thali has
// no --mono token and no monospace anywhere in it. Unlike check 3 above (which only
// validates the SYNTAX of whatever generic is used), this bans the keyword outright.
for (const file of appFiles) {
  if (![".css", ".ts", ".tsx", ".html"].includes(extname(file))) continue;
  const raw = readFileSync(file, "utf8");
  const text = stripComments(raw);
  for (const m of text.matchAll(/monospace/gi)) {
    fail("thali-monospace", `${rel(file)}:${lineOf(text, m.index)}`, "monospace is forbidden in this project (plan §A5a) — it was the Keystone tell in review round 2");
  }
  for (const m of text.matchAll(/var\(\s*--mono\b/gi)) {
    fail("thali-monospace", `${rel(file)}:${lineOf(text, m.index)}`, "var(--mono) — Thali has no mono token; this project has none by design (plan §A5a)");
  }
}

// --- T2. no letter-spacing at or above .14em -------------------------------
// The other half of the Keystone tell: mono uppercase micro-labels at .14em. Negative
// tracking (tightened display type, e.g. -.02em, used throughout this project) is fine —
// only WIDE positive tracking at or above the threshold is the forbidden move.
for (const file of appFiles) {
  if (![".css", ".ts", ".tsx"].includes(extname(file))) continue;
  const raw = readFileSync(file, "utf8");
  const text = stripComments(raw);
  for (const m of text.matchAll(/letter-spacing\s*:\s*(-?[\d.]+)em/gi)) {
    const val = parseFloat(m[1]);
    if (val >= 0.14) {
      fail("thali-letterspacing", `${rel(file)}:${lineOf(text, m.index)}`, `letter-spacing: ${m[1]}em — at/above the .14em Keystone tell (plan §A5a)`);
    }
  }
  for (const m of text.matchAll(/letterSpacing\s*:\s*["'`](-?[\d.]+)em["'`]/g)) {
    const val = parseFloat(m[1]);
    if (val >= 0.14) {
      fail("thali-letterspacing", `${rel(file)}:${lineOf(text, m.index)}`, `letterSpacing: "${m[1]}em" — at/above the .14em Keystone tell (plan §A5a)`);
    }
  }
}

// --- T3. no blurred box-shadow ---------------------------------------------
// The misregistration IS the design: every shadow is a hard offset in a second ink,
// `Npx Npx 0 <colour>` (or the --off/--bd token equivalents), never a blur radius
// (Thali_Master.md § Design System). `box-shadow: none` etc. are fine and skipped.
for (const file of appFiles) {
  if (![".css", ".ts", ".tsx"].includes(extname(file))) continue;
  const raw = readFileSync(file, "utf8");
  const text = stripComments(raw);
  for (const m of text.matchAll(/box-shadow\s*:\s*([^;{}]+)/gi)) {
    const value = m[1].trim();
    if (["none", "inherit", "initial", "unset"].includes(value)) continue;
    for (const shadow of splitTopLevel(value, ",")) {
      let tokens = splitTopLevel(shadow, " ");
      if (tokens[0] === "inset") tokens = tokens.slice(1);
      if (tokens.length < 3 || tokens[2] !== "0") {
        fail(
          "thali-blur-shadow",
          `${rel(file)}:${lineOf(text, m.index)}`,
          `"${shadow.trim()}" — every shadow must be a hard offset, "Npx Npx 0 <colour>" (plan §A5a, no blur anywhere)`,
        );
      }
    }
  }
}

// --- T4. the webfont link must load ONLY Anek Gujarati + Hanken Grotesk ---
// Ported from the mockup's own harness (Thali_Master.md v1.2 changelog): the font
// <link>/@import is parsed and every `family=` param must be one of the two approved
// faces — never a sibling's typeface (Chase Sapphire's Cormorant, Maximus's Libre
// Franklin, Keystone's Fraunces/Instrument/Spline Mono), and never a third face added
// without going through the mockup and Manc's approval first.
const ALLOWED_FAMILIES = new Set(["anek gujarati", "hanken grotesk"]);
for (const file of appFiles) {
  if (![".html", ".css", ".ts", ".tsx"].includes(extname(file))) continue;
  const raw = readFileSync(file, "utf8");
  const text = stripComments(raw);
  for (const m of text.matchAll(/https:\/\/fonts\.googleapis\.com\/css2?\?[^"'`)\s]+/g)) {
    const url = m[0];
    const familyParams = [...url.matchAll(/family=([^&"'`]+)/g)].map((fm) => fm[1]);
    for (const fam of familyParams) {
      const name = decodeURIComponent(fam.replace(/\+/g, " ")).split(":")[0].trim().toLowerCase();
      if (!ALLOWED_FAMILIES.has(name)) {
        fail(
          "thali-webfont",
          `${rel(file)}:${lineOf(text, m.index)}`,
          `webfont "${name}" is not Anek Gujarati or Hanken Grotesk — no sibling's typeface (plan §A5a)`,
        );
      }
    }
  }
}

// --- report --------------------------------------------------------------
for (const note of [...new Set(notes)]) console.warn(`note     ${note}`);

if (failures.length === 0) {
  console.log("check    all gates clean");
  process.exit(0);
}

const byCheck = failures.reduce((acc, f) => ((acc[f.check] ??= []).push(f), acc), {});
for (const [check, items] of Object.entries(byCheck)) {
  console.error(`\n${check} — ${items.length} problem${items.length === 1 ? "" : "s"}`);
  for (const { where, msg } of items) console.error(`  ${where}\n    ${msg}`);
}
console.error(`\n${failures.length} problem${failures.length === 1 ? "" : "s"}. These block Manc's commit — fix them, don't document them.`);
process.exit(1);
