/**
 * Worker-side date helpers. ISO `YYYY-MM-DD` strings only — Thali has no money, no times, no
 * timezones: every date is a calendar day (`AGENTS.md` §4). All arithmetic below is done
 * against UTC midnight so it can never be nudged by the machine's local timezone.
 *
 * This is a small, worker-local copy of what step 05's `src/lib/weeks.ts` will need on the
 * client side. It is not shared via `shared/` today because `src/lib` doesn't exist yet
 * (step 05 hasn't landed) and `weeks.ts` is named as living there, not in `shared/`
 * (`Thali_Tracker.md` row 05) — see `tasks/step-04.md` § Deviations. When step 05 lands, its
 * `mondayOf()` should match this one byte-for-byte; if the two ever need to actually share
 * code, promoting this file's contents into `shared/` is the fix, not a third copy of the
 * logic.
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True for a syntactically valid ISO date that also round-trips through a real UTC calendar
 * date — rejects nonsense like `2026-02-30` that the regex alone would accept.
 */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * The Monday of the ISO week containing `value`. Used both to validate a `weekStart`
 * (`mondayOf(x) === x` — a non-Monday key would fragment one week's plan across two keys) and,
 * later, for week navigation.
 */
export function mondayOf(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const offset = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + offset);
  return dt.toISOString().slice(0, 10);
}

/**
 * `weekStart` plus `weekday` (0 = Monday .. 6 = Sunday) days — the derived `served_on` date
 * for a plan row. **Never stored** (`Thali_Master.md` § Data Model): storing it would let it
 * drift from the plan row it belongs to.
 */
export function servedOn(weekStart: string, weekday: number): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + weekday);
  return dt.toISOString().slice(0, 10);
}
