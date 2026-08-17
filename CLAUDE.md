# Thali — Agent Rules

This file (and the byte-identical `AGENTS.md` beside it) is the contract every agent session must follow. Full detail lives in `../Main/Thali_Master.md` and `../Main/Thali_Implementation_Plan.md` — read those first, then `../Main/Thali_Tracker.md` end-to-end, then the assigned `../Main/tasks/step-NN.md`.

Ported from `maximus-app/CLAUDE.md`, which was ported from Keystone. Rules that differ are marked *(differs from Maximus)*; everything else is deliberately identical so the habits transfer.

## 1. Design fidelity

The authoritative design is `../Main/thali-mockup.html` — one self-contained, `file://`-openable mockup, not a set of shipped pages *(differs from Maximus: Maximus's v1 is live pages; Thali's is a single mockup, like Keystone)*. Consume its tokens, components and spacing only — never invent styling. If it doesn't cover a state, component or case you need, STOP and ask Manc; do not guess.

- **Tokens are global, not per-page.** `src/theme/tokens.css` holds every design token — the eight ink drums, paper/stock/ink, `--r`/`--r-sm`/`--bd`/`--off`, `--ez` — ported VERBATIM from the mockup's `:root` and `html[data-mode="dark"]` blocks. Not "inspired by": the same values. It is the one file where raw hex is legal.
- **`src/theme/base.css` owns the shared primitives** — the halftone `body::before`, `.sticker`, `.mini`/`.mini.round`, `.chip`, `.field`, `.segs`, `.blank`. No later step may redefine any of these; extend by adding a modifier class, not by shadowing the rule.
- **No raw hex colors and no raw px in app code.** Every color comes from a token in `src/theme/tokens.css`; spacing and radii come from that file's `--r`/`--r-sm`/`--bd`/`--off` set. `grep -rnE '#[0-9a-fA-F]{3,6}' src/ --include='*.tsx'` must return zero matches. `scripts/check.mjs` runs this on every build.
- **`font-family` generic fallback goes OUTSIDE the `var()`.** Any `font-family` built on a custom property must end with a literal generic keyword as its own top-level comma item — `font-family: var(--display), sans-serif;`. **Never** `var(--display, sans-serif)` — that form is invisible to WebStorm's "Font property does not have generic default" inspection, which does not parse inside `var(...)`, and it will fail Ujjval's commit-time Analyze Code even though the CSS is fine. Same rule for inline style objects.
- **Every shadow is a hard offset, never a blur.** `Npx Npx 0 <colour>` (or the `--off`/`--bd` token equivalents) — the misregistration IS the design. `scripts/check.mjs` check T3 enforces this mechanically.
- **No monospace, no letterspaced uppercase micro-labels (`letter-spacing` ≥ `.14em`), no gradients, and no sibling's typeface.** These are Thali's `plan §A5a` — the same rule Every Project Is Its Own World. Forbidden by name because a v1.1 draft violated it by copying Keystone's grammar and was correctly rejected: *"you copy pasted keystone into this!! very bad!!"* `scripts/check.mjs` checks T1/T2/T4 enforce the first three mechanically; there is no mechanical check for "no gradients" (a regex would be too noisy) — treat it as a review rule.
- **The webfont `<link>` may load ONLY Anek Gujarati + Hanken Grotesk.** Check T4.

### 1a. Mockup first, then Manc's approval, then the app — no exceptions

**Any change a human can SEE goes into `../Main/thali-mockup.html` before it goes into `thali-app/`.** New component, new state, new layout, new color, moved element, changed copy — all of it. The order is fixed:

1. **Design it in the mockup.** Static, `file://`-openable, real sample state, using the tokens that already exist there.
2. **Stop and show Manc.** Say what changed. Then wait. Approval is his word in the thread — not your own read of the design system, not "it matches the tokens so it's fine."
3. **Only then port it** into `thali-app/`, and only the variant he picked.

Corollaries, each of which has already been violated on Maximus or Keystone:

- **Never invent a visual state the mockup has no example of** — empty, error, overflow, zero, a badge state the roster doesn't demonstrate. If the mockup doesn't draw it, it doesn't exist yet; ask.
- **A stripped-down port is a new design.** Dropping a label, a legend, or copy off an approved component changes what it communicates, so it needs its own pass through steps 1–3.
- **If a step file tells you to build UI the mockup doesn't contain, that is a bug in the step file.** Leave the app alone and ask Manc, per the tasks template's own rule (no un-mocked UI, ever).

The mockup is cheap to change and safe to throw away; app code is neither. When in doubt the answer is always "put it in the mockup and ask."

## 2. No tests, ever

No unit/integration/e2e/snapshot tests, no test frameworks, runners, coverage, or test hooks. No `curls/` script or any other per-step test harness. No "Verify" section, visual-check items, or review table in a step file either (`tasks/_TEMPLATE.md` § No verification gate).

What you owe instead, every step: **`npm run check`, `npm run typecheck` and `npm run build` all clean.** Manc reviews the running app himself and files a new step for anything broken.

**`npm run check` is the gate, and it is not a test suite.** It is `scripts/check.mjs`, ported verbatim from `maximus-app/scripts/check.mjs` (checks 1–10) plus four Thali-specific design checks (T1–T4, §14 below). It runs on the Node standard library alone, so it works before `npm install`, and `npm run build` runs it first so a broken tree cannot produce a bundle. If a check fires, **fix the code — do not document the failure, do not add an exception, and do not disable the check.** If a check is genuinely wrong, fix `scripts/check.mjs` and say so in your session notes.

## 3. API envelope

Every endpoint is `POST` with a JSON body. Responses are always exactly one of:

```json
{ "ok": true, "data": {} }
```

```json
{ "ok": false, "error": { "code": "BAD_INPUT", "message": "human-readable" } }
```

Validation failures are `BAD_INPUT`, never a 500. Unknown route is `NOT_FOUND`. `DEPLOY_MODE` not `"local"` is `UNAUTHORIZED` (§6). A route stubbed pending step 04 is `NOT_IMPLEMENTED`.

## 4. Dates, not money *(differs from Maximus — replaces its money-in-cents rule)*

Thali has no money anywhere in it. Every date is an ISO `YYYY-MM-DD` string. A week is keyed by its **Monday**. `served_on` — the date a plan item is actually eaten on — is **derived**, never stored: `week_start + weekday days` (`Thali_Master.md` § Data Model). Storing it would let it drift from the plan it belongs to.

## 5. No git at all in the sandbox

**Before ANY git operation Manc runs — `add`, `commit`, `push` — `npm run check` must be green.** It fails on a missing `.gitignore` and on any unignored file over 50 MB. If you are handing Manc a commit-time command in a step file, lead with `npm run check &&`.

**The repo root is `thali-app/`**, same convention as Maximus and Keystone. `Main/`, `MASTER.md` and the mockups are deliberately outside version control.

**Never run any git command against this repo from the agent sandbox — not even reads.** `git status` / `git diff` / `git log` are **not** safe exceptions if the mount can't `unlink` — they can still take a lock that then blocks every subsequent git operation until it's deleted by hand.

- Get history or state from files, not from git. If you genuinely need git output, put the command in the **"Commands for Manc"** block.
- Leave changes uncommitted for Manc to review and commit.
- **If you do strand a lock:** try `mv .git/index.lock .git/index.lock.stale` (this mount may not support `rm`), then list the leftover file in "Commands for Manc".

## 6. Local-only, and what that means for you

**Thali runs on Manc's machine and nowhere else.** No deploy, no domain, no Cloudflare account, $0. `wrangler.jsonc` has `"vars": { "DEPLOY_MODE": "local" }` and that is the only mode that matters. **No step may require a deployment to work**; if you find one that does, that is a bug in the step file.

**Unlike Maximus, Thali has no auth story for a hosted mode at all** *(differs from Maximus)* — no Cloudflare Access, no login UI, no session table, no password (plan §B). `worker/lib/access.ts`'s `requireAccess()` no-ops under `DEPLOY_MODE: "local"` and **throws `UNAUTHORIZED` for anything else** — it fails closed rather than serving the family's plan to the open internet, because there is genuinely nothing implemented to check. **Do not delete it** and **do not make it sniff the hostname**: that was Maximus's first implementation and it was wrong, because `vite dev --host` serves on a LAN IP that is neither `localhost` nor `127.0.0.1`, so reaching the page from a phone on the same wifi would fail every API call with `UNAUTHORIZED` and no obvious cause. That path is *more* likely on Thali than it ever was on Maximus — Manc opening the board from his phone in the kitchen is the normal case, not an edge case.

**The local SQLite file IS the database.** `.wrangler/state/` is gitignored — correctly, it is local state and a full copy of the family's meal history — which means **git is not a backup.** Run `npm run db:backup` (step 12) before anything that touches `.wrangler/`, and tell Manc when you have.

**You may**, freely, in the sandbox: `npm run dev` / `build` / `typecheck`; `wrangler d1 migrations apply thali --local` and `wrangler d1 execute thali --local --command "..."` — local D1 needs no account. **Note:** `workerd` is a platform binary and the agent sandbox may not be able to boot a live Worker (Maximus hit this wall on its steps 03/13/14) — if `npm run dev` won't boot here, that is expected; hand Manc the "Commands for Manc" block instead of treating it as a bug to fix.

**You may NOT**, ever: anything that touches a real Cloudflare account — `wrangler login`, `wrangler deploy`, `wrangler d1 create`, any `--remote` command. Thali is local-only, so none of these should come up at all. Anything genuinely requiring Manc's machine ends the session with a **"Commands for Manc"** block: exact commands, expected output, what to report back.

**Never write a Cloudflare API token, account ID, or secret into a file in this repo.**

**Run `npm approve-scripts --allow-scripts-pending` after any install that reports blocked scripts.** npm 11 requires explicit approval for install scripts, and `workerd`, `esbuild` and `fsevents` all have them.

**`@cloudflare/vite-plugin`, `wrangler` and `@cloudflare/workers-types` are one matched set.** They peer-depend on each other and drift constantly. Never bump one alone, and **never use `--force` or `--legacy-peer-deps`** to get past a conflict between them.

## 7. Close the loop in the docs before ending your session

Implementing a step is NOT done until the docs say so. Before ending, ALL FOUR: (a) tick the step's checkboxes + update the Status header in `../Main/tasks/step-NN.md`; (b) append a Session-notes line there; (c) update the step's row in `../Main/Thali_Tracker.md`; (d) append the changelog in `../Main/Thali_Implementation_Plan.md` §D. An unmarked completed step reads as "not started" to every other session. If you ran out of context mid-step, mark what IS done and state explicitly what isn't.

## 8. Ports

Vite dev **5473** — deliberately disjoint from Maximus (5373), Keystone (5273/8100/5432) and Pulse (5173/8000/3306), so all four run at once. There is no separate API port — the Worker serves the SPA and `/api/*` on one origin, which is also why **there is no CORS configuration anywhere in this repo** and none should be added.

## 9. WebStorm commit-time inspections — warnings BLOCK Ujjval's commits

Ujjval commits from WebStorm with commit-time **"Analyze code"** enabled, and warning-level inspections fail the commit. Code that typechecks and builds clean can still be unshippable.

- **`font-family` must end in a literal generic outside any `var()`** — full rule in §1.
- **One top-level value per ` ```json ` fence in Markdown.**
- **No unused imports, locals, or parameters**, and prefer the shortest import path a barrel actually re-exports — but never shorten if it breaks the build or introduces an import cycle; leave it deep and say so in the step file.

If Manc reports a warning you cannot reproduce from the code alone, ask for the literal warning line (`file:line` + message) rather than guessing.

## 10. Never commit build byproducts — and NEVER build into a new folder

`dist/`, `.wrangler/`, `*.tsbuildinfo`, `.idea/`, `.DS_Store`, `.dev.vars` (but `.dev.vars.example` yes), `node_modules/`, and `vite.config.*.timestamp-*.mjs`. All are in `.gitignore`.

**The hard rule:** when you cannot empty the real output dir under this mount, **build to a temp dir OUTSIDE the repo** — `npm run build -- --outDir /tmp/thali-build`. **Never** invent a sibling folder inside the repo — Keystone's `dist.stale*`/`storybook-verify*` mistake produced ~250 committed generated files. A build artifact belongs outside the repo, full stop.

## 11. Parallel subagents

Use subagents in parallel for genuinely independent pieces of work — separate routes, separate components, separate migrations. Don't serialize work that has no dependency between its parts. Sessions may run concurrently, so **re-read a shared doc (tracker row, plan changelog, step file) immediately before writing to it** — never write from a stale read.

## 12. Scope: the week board and its pickers *(differs from Maximus's card-by-card scope)*

v1 is **the week board and its pickers**: 7 days × lunch/dinner, per-day dinner themes, per-person overrides, last-eaten badges, add-a-dish, restaurant night (`Thali_Tracker.md` § Scope of v1). Groceries, nutrition, cost tracking, recipe storage, calendar sync and multi-household/accounts are all out of scope — do not scaffold them, do not "leave a hook" (plan §A rule 9).

## 13. No analytics, no trackers, no telemetry

The only network calls this app makes are to its own `/api/*` and to Google Fonts for Anek Gujarati + Hanken Grotesk (check T4 enforces that it is only those two families). No third-party scripts, no error reporting service, no analytics.

## 14. Rules provenance — why this file must be COPIED, never rewritten

**This table is the fix for the root cause of the Pulse → Keystone regressions**, inherited unchanged from Maximus's own §14: Keystone's agent contract was a *shortened rewrite* of Pulse's rather than a copy, and the rules Pulse had only learned by getting burned were silently dropped — so Keystone re-broke the same things. Ujjval's words: *"How is it that the same things that I fixed in Pulse are now broken in Keystone?"*

So: **when Thali's rules are carried to a fifth project, copy this file and then diff it. Do not summarise it.** Every row below is a rule that already cost real cleanup work, on this project or one of its siblings.

| Rule | Where it lives here | Origin — the incident that produced it |
|---|---|---|
| No monospace anywhere | §1, `check.mjs` T1 | **Thali**, review round 2 (v1.1 → v1.2). The mockup's first visual pass studied Keystone and adopted DM Mono for every label and number. Manc: *"you copy pasted keystone into this!! very bad!!"* — full rebuild followed. Written down as prose in plan §A5a first; it held once, so it moved to a mechanical check rather than trusting prose a second time |
| No `letter-spacing` ≥ `.14em` | §1, `check.mjs` T2 | **Thali**, same incident — Keystone's mono micro-labels ran at `.14em` tracking. The other half of the same tell |
| No blurred `box-shadow` | §1, `check.mjs` T3 | **Thali**, review round 2. The whole visual idea is a misregistered offset-printed shadow in a second ink; a blurred shadow anywhere would read as a generic soft-UI shadow instead, which is exactly what draft 1 shipped and Manc called "the classic rounded corners" |
| Webfont `<link>` loads only Anek Gujarati + Hanken Grotesk | §1, §13, `check.mjs` T4 | **Thali**, review round 2, generalising the mockup's own harness (a font-`<link>` parse-and-assert check already proven there per `Thali_Master.md`'s v1.2 changelog) |
| `font-family` generic outside `var()` | §1, `check.mjs` | Pulse step 20b, via Maximus §1. Pulse's *first* fix — the generic as the `var()`'s own fallback argument — was wrong; WebStorm does not parse inside `var()` |
| No raw hex / no raw px in app code | §1, `check.mjs` | Pulse, via Maximus §1 |
| Mockup first → Manc approves → then the app | §1a | Maximus, 2026-07-29, via Maximus §1a. A component shipped in the running app that the card's own mockup had no example of |
| One top-level value per ` ```json ` fence | §9, `check.mjs` | Pulse step 20c, via Maximus §9 |
| No unused imports/locals/params; barrel-import warnings | §9, `tsconfig` flags, `check.mjs` | Pulse step 20, via Maximus §9. Barrels are banned outright here so the inspection cannot fire |
| Never commit build byproducts | §10, `.gitignore`, `check.mjs` | Pulse step 09, via Maximus §10 |
| `vite.config.*.timestamp-*.mjs` | §10, `.gitignore`, `check.mjs` | Pulse, via Maximus §10. Vite writes a fresh one on *every* run |
| Never build into a new sibling folder | §10 | Keystone, via Maximus §10. ~250 generated files committed as `dist.stale*`/`storybook-verify*` siblings |
| `.idea/` never tracked | §10, `.gitignore` | Pulse, via Maximus §10. Ujjval works in WebStorm, so the folder exists on day one on every machine |
| No git at all in the sandbox | §5 | Keystone, via Maximus §5. A FUSE-style mount that cannot `unlink` strands `.git/index.lock` |
| Close the loop in the docs | §7 | Pulse, via Maximus §7. Correct code shipped with the docs still saying "not started" |
| Both contract files byte-identical | §14, `check.mjs` | Pulse/Keystone, via Maximus §14. Drift is how a rule gets quietly lost |
| `"workers_dev": false` | §6, `check.mjs` | Maximus §14, generalised here: no auth in front of a hosted Thali at all means an accidental `wrangler deploy` is worse here than on Maximus, not better |
| Mode from a var, never from the hostname | §6, `worker/lib/access.ts` | Maximus §14, and *more* load-bearing on Thali — a phone in the kitchen is the normal way this app gets opened |
| Cloudflare packages are one matched set | §6 | Maximus §14. `wrangler`/`@cloudflare/workers-types` peer-depend on each other and a forced install resurfaces as unrelated type errors |
| Every tsconfig `types` entry must be a declared dependency | §2, `check.mjs` check 10 | Maximus §14. `types: ["node"]` with no `@types/node` declared → `TS2688` |
| `src/vite-env.d.ts` must exist | §2, step-02 §2a | Maximus §14. Without `/// <reference types="vite/client" />`, every `import "./x.css"` is `TS2307` |
| Approve npm install scripts once | §6 | Maximus §14. npm 11 blocks `workerd`/`esbuild`/`fsevents` postinstalls by default |
| `.git/info/exclude` belt + `npm run check` before every git operation | §5, `check.mjs` | Maximus §14. `.gitignore` disappeared from disk once; `.git/info/exclude` is the layer that survives that |
| No unignored file over 50 MB | `check.mjs` | Same incident, via Maximus §14 |
| Local SQLite file is not backed up by git | §6, step 12 | Maximus §14, a direct consequence of going local-only. Here it is the family's meal history, not spending history, but the same fact applies: `rm -rf .wrangler` takes it all |
| Every project ships a `Taskfile.yml` + `scripts/dev-server.sh`, and gets `start*`/`stop*`/`restart*` in `~/.devtools/proj.sh` **on day one** | §15, step 13 | **Thali**, 2026-08-17. Thali reached step 12 with neither. Nothing was broken and nothing failed a check — it was simply never wired up, so `task up` in `thali-app/` answered `no Taskfile found`, `startt` was `command not found`, and step 03 sat open at 03d because the step file had no command to hand Manc that his shell would accept. A gap that no gate can catch is exactly the kind §14 exists for |

## 15. The dev runner — `task up` and `startt` *(added by step 13)*

**Never tell Manc to run `npm run dev` by hand, and never hand him a bare `wrangler` incantation in a "Commands for Manc" block when a task exists.** Two layers, both of which must keep working:

**Layer 1 — `thali-app/Taskfile.yml`** (ported from `maximus-app/Taskfile.yml`, run from the repo root):

| | |
|---|---|
| `task up` | migrations, then the dev server in the **background** on 5473, returns the shell. What `startt` calls |
| `task down` / `task status` | stop it / say whether it's up and on what pid |
| `task dev` | foreground with logs on screen, Ctrl-C to stop — identical to `npm run dev` |
| `task host` | foreground, `--host`, for opening the board on a phone in the kitchen |
| `task migrate` / `task tables` | apply local D1 migrations / list the tables that landed — **this is the pair step 03 needed** |
| `task sql -- "select …"` | one statement against the local D1 |
| `task backup` | step 12's snapshot; runs automatically inside `task nuke` |
| `task check` / `typecheck` / `build` / `gate` | the three gates individually, or `gate` for all three — plan §A rule 3 in one command |
| `task clean` / `task nuke` | drop `dist/` + the vite cache / also drop the local database (backs up first, prompts) |

**`task up` applies migrations before it starts the server**, deliberately: that is the Maximus §D v2.8 bug (`no such table` on every page load) made structurally impossible here.

**Layer 2 — `~/.devtools/proj.sh`**, the shared launcher for all four projects, sourced from `~/.bash_profile` with:

```
[ -f ~/.devtools/proj.sh ] && source ~/.devtools/proj.sh
```

It defines `startt` / `stopt` / `restartt` (and `startm`/`startk`/`startp` for the siblings): git-pull `main`, run `task up`/`task down`, open `http://localhost:5473`. Flags: `--no-pull`, `--no-open`, `--no-defaults`. `cdt` jumps to `thali-app/`, `cdtd` to the docs root.

**If `startt` is "command not found", that rc line is missing — that is the only failure mode**, and it is the one that produced this section. `proj.sh` lives outside every repo on purpose (a `git clean` in one project must not take the launcher for the other three), which also means **it is not in any backup this repo makes.**

**Rules for agents:**

- **`scripts/dev-server.sh` must stay a real file invoked as `bash ./scripts/dev-server.sh`.** Do not "simplify" it into an inline `nohup npm run dev &` in the Taskfile. Task runs `cmds` through mvdan/sh, an interpreter compiled into its own binary; a process backgrounded there dies with the command that started it. Maximus shipped the inline version and got "Dev server exited during startup" with an empty log every time (2026-07-29).
- **Adding a task is cheap; adding a port is not.** 5473 is Thali's and is spoken for in three other files (`vite.config.ts`, `wrangler`'s dev server, `proj.sh`). §8 has the full allocation.
- **A step file that needs Manc to run something local writes it as a task**, e.g. `task migrate && task tables`, not four lines of `npx wrangler`.
- **When these rules are carried to a fifth project, wire the runner in step 02**, not step 13. `proj.sh`'s own header carries the five-item checklist.
