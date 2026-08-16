/**
 * The score-strip counting logic. Ported verbatim from the mockup's `renderScores()`
 * counting loop (lines ~927-939 of `Main/thali-mockup.html`) — the tally math itself, not
 * the DOM/animation half of that function, which lives in `ScoreStrip.tsx` instead.
 *
 * Pure function, no React: `slot.ts`'s own header names this file as a future second
 * consumer of `slotLabel`/`findItem`/`findOverride` alongside `DayCard`/`Slot`/`EaterChips`,
 * so the counting rules live in exactly one place rather than being re-derived per screen.
 */

import type { WeekState } from "../../shared/api";
import { findItem, findOverride, slotLabel } from "./slot";
import { freshness } from "./freshness";
import { servedOn } from "./weeks";
import { PEOPLE } from "./roster";

export interface WeekTally {
  /** 0..14 — how many of the 14 slots have something decided. */
  filled: number;
  /** How many decided slots are a restaurant (Night off). */
  off: number;
  /** How many decided slots have never been eaten before (freshness.days === Infinity). */
  firsts: number;
  /** How many decided slots were eaten within the last 21 days (but not never-eaten). */
  reps: number;
  /** How many person-overrides exist across the whole week. */
  ovs: number;
}

const MEALS = ["lunch", "dinner"] as const;

export function weekTally(week: WeekState): WeekTally {
  let filled = 0;
  let off = 0;
  let firsts = 0;
  let reps = 0;
  let ovs = 0;

  for (let weekday = 0; weekday < 7; weekday++) {
    for (const meal of MEALS) {
      const item = findItem(week.items, weekday, meal);
      const label = slotLabel(item, week.dishes, week.restaurants);
      if (label) filled++;
      if (item && item.restaurantId) off++;
      if (label && label.id) {
        const fr = freshness(label.kind === "rest" ? "rest" : "dish", label.id, servedOn(week.weekStart, weekday), week.lastEaten);
        if (fr) {
          if (fr.days === Infinity) firsts++;
          else if (fr.days <= 21) reps++;
        }
      }
      for (const person of PEOPLE) {
        if (findOverride(week.overrides, weekday, meal, person.id)) ovs++;
      }
    }
  }

  return { filled, off, firsts, reps, ovs };
}
