/**
 * Client-side date helpers. ISO `YYYY-MM-DD` strings only — Thali has no money, no times, no
 * timezones: every date is a calendar day. Unlike the worker's copy of these helpers
 * (`worker/lib/dates.ts`, which works in UTC because it runs on Cloudflare's edge), everything
 * here is done in *local* time, deliberately: this app is one household in one timezone, and a
 * UTC conversion would risk shifting a meal across midnight for anyone west of Greenwich. Do not
 * introduce `Date.UTC` here — that would change behavior, not just style.
 *
 * `servedOn` below is the only place `week_start + weekday` is computed client-side; the worker
 * computes its own copy in SQL. The two use different internal representations (local `Date`
 * here, UTC `Date` there) but produce the same date *strings* for the same string+integer
 * inputs. If that ever stops being true, the last-eaten map silently lies — keep this file to
 * pure date-string arithmetic in local time.
 */

/** Format a `Date` as an ISO `YYYY-MM-DD` string, using its local-time components. */
export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse an ISO `YYYY-MM-DD` string into a local-time `Date` (midnight, local timezone). */
export function parse(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * The Monday (local midnight) of the week containing `d`. Round-trips:
 * `mondayOf(mondayOf(d)) === mondayOf(d)` for any `d`, including a Sunday — the
 * `(getDay() + 6) % 7` offset is what makes Sunday belong to the Monday five days back, not
 * forward.
 *
 * Takes/returns a `Date` (unlike the worker's string-based `mondayOf`), since callers here
 * compose it with `iso`/`parse` for week navigation.
 */
export function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/** `d` shifted by `n` days (local time). `n` may be negative. */
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** The ISO week-start `n` weeks after `s` (`n` may be negative to go backward). */
export function shiftWeek(s: string, n: number): string {
  return iso(addDays(parse(s), n * 7));
}

/** The ISO date `weekday` days after week-start `ws` (0 = Monday .. 6 = Sunday). */
export function servedOn(ws: string, wd: number): string {
  return iso(addDays(parse(ws), wd));
}

/** Whole days from ISO date `a` to ISO date `b` (positive when `b` is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
}

export const MONTHS: readonly string[] = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const DOWS: readonly string[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Human-readable `"Mon D"` rendering of an ISO date, e.g. `"Aug 16"`. */
export function pretty(s: string): string {
  const d = parse(s);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
