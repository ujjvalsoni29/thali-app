# Thali

Thali is a local-only weekly meal-planning board for the family. It runs with `npm run dev` on
Manc's machine and nowhere else — no deploy, no domain, no Cloudflare account, $0.

## Quick start

```
npm install
npm run db:migrate:local    # first time only
npm run dev
```

## Local data safety — backups & restore

**Git is not a backup.** `.wrangler/state/` holds the real SQLite database that backs this app,
and it's gitignored — correctly, it's local state, not source. That means a stray
`rm -rf .wrangler`, a bad `wrangler d1 migrations apply`, or a botched `wrangler` upgrade takes
every week the family has ever planned with it. Unlike a bank statement, that history can't be
reconstructed from anywhere else.

### Backup

```
npm run db:backup
```

`scripts/backup.mjs` walks `.wrangler/state/` for the live SQLite file and copies it into
`backups/` (also gitignored) as `thali-YYYY-MM-DD-HHmm.sqlite`. It keeps the most recent 20
backups and prunes older ones automatically.

Run it:

- before anything that touches `.wrangler/` — a reinstall, a `wrangler` upgrade,
  `wrangler d1 migrations apply`
- once a month or so, out of habit

If it ever prints "no database found" while the app is working, that's a bug in the script's
search path, not a missing database.

### Restore

1. Stop the dev server.
2. Copy the backup you want from `backups/` back over the live database file. It lives at
   `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite` — the hash is wrangler's
   internal id for the database and is different on every machine (it is **not** the placeholder
   `database_id` in `wrangler.jsonc`). List the folder to find yours:
   `ls .wrangler/state/v3/d1/miniflare-D1DatabaseObject/` — there should be exactly one `.sqlite`
   file in there that isn't named `metadata.sqlite` (that name is Miniflare's own bookkeeping,
   not app data — `backup.mjs` skips it for the same reason).
3. Restart with `npm run dev`.

**Restore drill:** a backup nobody has restored is a hypothesis, not a safety net. The mechanism
was proven end-to-end on 2026-08-17, against a freshly-migrated local D1 database — the agent
sandbox that built this step has no route to Manc's real `.wrangler/state`, so this exercised the
script and the procedure, not the family's actual history. `npm run db:backup` produced
`thali-2026-08-17-0800.sqlite`; a second run a minute later produced a distinct
`thali-2026-08-17-0801.sqlite` alongside it, proving spaced-out runs don't clobber each other. A
synthetic run with 26 fake backup files confirmed pruning kept the newest 20 and deleted the
oldest 6. The restore itself was one `cp` of `thali-2026-08-17-0801.sqlite` over the live file at
`.wrangler/state/v3/d1/miniflare-D1DatabaseObject/9ba2b04bf514d9facfd57ed57d849e77241a7adc99d1c1545d06688b43d84248.sqlite`
— `md5sum` matched before and after, and
`wrangler d1 execute thali --local --command "SELECT COUNT(*) FROM sqlite_master;"` returned the
same 20 rows against the restored file, no repair step needed.

**Manc — do this once for real:** `npm run db:backup`, then the three restore steps above against
your own `backups/` and your own live file. If your machine's path pattern differs from the one
above, update this section with what you actually found.

### What this does and doesn't cover

There's no automatic or scheduled backup — that would need a running daemon on Manc's machine,
which is more moving parts than the risk justifies for a file that changes a few times a week.
Backups are also **not encrypted and not synced off-machine** — they live on the same disk as the
database. This protects against `rm -rf` and a bad migration. It does **not** protect against
losing the laptop.
