/**
 * "Surprise Me" — the one place this app decides anything on its own (tasks/step-10.md).
 * Ported from the approved mockup's `surprise()` / `eligible()` / `weightedPick()`
 * (`Main/thali-mockup.html` lines ~1298-1354), adapted to the real `WeekState` shape and to
 * the server-computed `lastEaten` map instead of a client-side history scan.
 *
 * Manc's spec, verbatim: "needs to be smart and only include things that have not been made
 * for at least 2 weeks and still follow the categories." Both halves of that are HARD
 * constraints with no fallback path:
 *
 *  - `COOLDOWN_DAYS` (imported from `freshness.ts`, never redeclared here) is a floor, not a
 *    preference. A candidate must be 14+ days since last eaten, or never eaten at all — a
 *    missing `lastEaten` entry reads as `days === Infinity`, which passes any floor by
 *    construction, so "first time" candidates need no special-casing in `eligible`.
 *  - The day's dinner theme (or the day's shaak-format `needsDal` pairing, for lunch) is a
 *    filter, not a hint. There is no falling back to another theme's dishes or to a shaak that
 *    doesn't match the format's dal pairing.
 *
 * If a slot has no legal candidate, it is left EMPTY and its name (`"Thu dinner"`) goes in
 * `stuck` — never filled with something that breaks either rule above. That is the feature,
 * not a limitation: do not add a "pick the oldest anyway" fallback here. A future session
 * tempted to do that should re-read tasks/step-10.md §1 first.
 *
 * This module is pure and never mutates or writes anything — it only *decides*. It returns a
 * list of slot writes and a list of stuck slot names; the caller (the Week page) is the one
 * that fires the actual `/api/slot/set` mutations and renders the toast. Keeping the solver
 * pure keeps it testable without a server or a DOM, and keeps the toast copy ("Filled N. Left
 * empty: …") in exactly one place rather than duplicated into this file.
 */

import type { Dish, LunchFormat, Meal, Restaurant, Theme, WeekState } from "../../shared/api";
import { COOLDOWN_DAYS, freshness, type FreshnessKind } from "./freshness";
import { findItem } from "./slot";
import { DOWS, servedOn } from "./weeks";
import { LUNCH_FORMATS } from "./roster";

/** One slot the solver decided to fill. Shaped like `SlotSetBody` minus `weekStart` (the
 *  caller already knows which week it's operating on). */
export interface SlotWrite {
  weekday: number;
  meal: Meal;
  dishId?: string;
  restaurantId?: string;
  lunchFormat?: LunchFormat;
}

export interface SurpriseResult {
  placed: SlotWrite[];
  /** Slot names ("Thu dinner") that had no legal candidate, left untouched. Named, not
   *  counted — Manc needs to know *which* night to think about, not just how many. */
  stuck: string[];
}

/** Monday..Sunday shaak-format rotation for lunch (step-10.md §10b). Every entry here is a
 *  format with `wantsShaak: true` in `LUNCH_FORMATS` — the format-only formats (Dal Dhokli,
 *  Khichdi, Salad + Chass) need no shaak at all, so "surprising" someone with one would just
 *  be picking a whole meal for them, not a shaak. Do not add those here. */
const LUNCH_ROTATION: readonly LunchFormat[] = [
  "full",
  "full",
  "rotli-shaak",
  "rotla-shaak",
  "full",
  "full",
  "rotli-shaak",
];

/** How hard `weightedPick` biases toward the longest-since-eaten end of a ranked list. A
 *  taste constant, not a derived value — see tasks/step-10.md §4 before changing it: raise it
 *  if runs feel repetitive, lower it if they feel too random. One number, one place. */
const PICK_BIAS = 1.7;

interface Ranked<T> {
  x: T;
  days: number;
}

/**
 * Filters `list` to items whose freshness (as of `date`) is at or past the cooldown floor —
 * `days >= COOLDOWN_DAYS`, where "never eaten" is `Infinity` and always passes — then sorts
 * descending by days so the longest-since-eaten (or never-eaten) candidates lead the list.
 */
function eligible<T extends { id: string }>(
  list: readonly T[],
  kind: FreshnessKind,
  date: string,
  lastEaten: WeekState["lastEaten"],
): Ranked<T>[] {
  return list
    .map((x) => ({ x, days: freshness(kind, x.id, date, lastEaten)?.days ?? Infinity }))
    .filter((r) => r.days >= COOLDOWN_DAYS)
    .sort((a, b) => b.days - a.days);
}

/**
 * Picks one candidate from an already-`eligible`, descending-by-days list, weighted toward
 * the front (the longest-since-eaten end) by `Math.pow(Math.random(), PICK_BIAS)`. Never
 * deterministic on purpose — a uniform pick converges two runs on the same dish too often,
 * and a deterministic "always the oldest" pick makes the button boring. Returns `null` for an
 * empty list, which the caller reads as "no legal candidate for this slot."
 */
function weightedPick<T>(ranked: readonly Ranked<T>[]): T | null {
  if (!ranked.length) return null;
  const i = Math.floor(Math.pow(Math.random(), PICK_BIAS) * ranked.length);
  return ranked[Math.min(i, ranked.length - 1)].x;
}

/**
 * Fills every currently-empty slot in `week` with a candidate that respects the 14-day
 * cooldown floor and the slot's category (lunch format's dal pairing, or dinner theme /
 * `firsttime`), and reports which slots it could not legally fill. Does not touch any slot
 * `findItem` already finds a row for — "surprise me" only ever completes a plan, it never
 * overrides a decision someone already made.
 */
export function surprise(week: WeekState): SurpriseResult {
  const placed: SlotWrite[] = [];
  const stuck: string[] = [];

  for (let weekday = 0; weekday < 7; weekday++) {
    const date = servedOn(week.weekStart, weekday);

    // --- lunch --------------------------------------------------------------------------
    if (!findItem(week.items, weekday, "lunch")) {
      const formatId = LUNCH_ROTATION[weekday];
      const format = LUNCH_FORMATS.find((f) => f.id === formatId) ?? LUNCH_FORMATS[0];
      const pool: Dish[] = week.dishes.filter(
        (d) => d.kind === "shaak" && !d.archived && d.needsDal === !!format.dal,
      );
      const hit = weightedPick(eligible(pool, "dish", date, week.lastEaten));
      if (hit) {
        placed.push({ weekday, meal: "lunch", dishId: hit.id, lunchFormat: format.id });
      } else {
        stuck.push(`${DOWS[weekday]} lunch`);
      }
    }

    // --- dinner ---------------------------------------------------------------------------
    if (!findItem(week.items, weekday, "dinner")) {
      const themeId = week.themes[weekday];
      const theme: Theme | undefined = week.themeRoster.find((t) => t.id === themeId);

      if (theme?.kind === "rest") {
        const pool: Restaurant[] = week.restaurants.filter(
          (r) => !r.archived && r.whenKind !== "breakfast" && r.whenKind !== "snack",
        );
        const hit = weightedPick(eligible(pool, "rest", date, week.lastEaten));
        if (hit) {
          placed.push({ weekday, meal: "dinner", restaurantId: hit.id });
        } else {
          stuck.push(`${DOWS[weekday]} dinner`);
        }
      } else {
        const isFirstTime = themeId === "firsttime";
        const pool: Dish[] = week.dishes.filter(
          (d) =>
            d.kind === "dinner" &&
            !d.archived &&
            (isFirstTime ? !week.lastEaten.dish[d.id] : d.themeIds.includes(themeId)),
        );
        const hit = weightedPick(eligible(pool, "dish", date, week.lastEaten));
        if (hit) {
          placed.push({ weekday, meal: "dinner", dishId: hit.id });
        } else {
          stuck.push(`${DOWS[weekday]} dinner`);
        }
      }
    }
  }

  return { placed, stuck };
}
