/**
 * Freshness badge logic. The mockup computed "when was this last eaten" by scanning every
 * stored week client-side (`lastEaten(kind, id, before)`), which only worked because the mockup
 * kept its whole history in `localStorage`. The real app instead gets a pre-computed last-eaten
 * map from the server's `/api/week/get` response (`WeekState.lastEaten`), already excluding
 * anything on/after the week being viewed — so `freshness` here is a plain lookup against that
 * map, not a scan.
 */

import type { WeekState } from "../../shared/api";
import { daysBetween } from "./weeks";

/** Nothing may be picked by Surprise if it was eaten inside this window. */
export const COOLDOWN_DAYS = 14;

export type FreshnessKind = "dish" | "rest";

export interface Freshness {
  cls: string;
  txt: string;
  days: number;
}

/**
 * Freshness badge for `id` (a dish or restaurant id) as of `before` (the ISO date the slot is
 * served on). `lastEaten` is the server-computed map from `/api/week/get`; a missing entry means
 * never eaten before this week, which sorts as `days: Infinity` so it always sorts ahead of
 * everything else and always passes a cooldown check.
 */
export function freshness(
  kind: FreshnessKind,
  id: string | null,
  before: string,
  lastEaten: WeekState["lastEaten"],
): Freshness | null {
  if (!id) return null;
  const on = kind === "rest" ? lastEaten.rest[id] : lastEaten.dish[id];
  if (!on) return { cls: "f-new", txt: "New to us", days: Infinity };
  const n = daysBetween(on, before);
  if (n <= 7) return { cls: "f-hot", txt: n <= 1 ? "Yesterday" : `${n} days ago`, days: n };
  if (n <= 21) return { cls: "f-mid", txt: `${Math.round(n / 7)} weeks ago`, days: n };
  return { cls: "f-cool", txt: `Been a while · ${Math.round(n / 7)} wks`, days: n };
}
