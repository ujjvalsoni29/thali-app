/**
 * Turns a raw `PlanItem` / `PlanOverride` (the wire shape from `/api/week/get`) into what a
 * slot or an eater chip actually displays. Ported from the mockup's `slotLabel()` / `ovText()`,
 * adapted for two shape differences between the mockup and the real API:
 *
 *  - the mockup kept `S.dishes` and `S.shaaks` as two separate arrays; the real `WeekState`
 *    has one `dishes: Dish[]` array with a `kind: "shaak" | "dinner"` column instead, so a
 *    lookup by `dishId` is a single `.find()` regardless of which kind it turns out to be.
 *  - the mockup's week state was `items: Record<string, Item>` keyed by `"wd:meal"`; the real
 *    `WeekState` carries `items` / `overrides` as flat arrays, so callers need `findItem` /
 *    `findOverride` instead of a template-string key lookup.
 *
 * This file is the single source of truth for "what does this slot show" — `src/lib/tally.ts`
 * (the score strip) and `DayCard`/`Slot`/`EaterChips` (the board) both read through it rather
 * than each re-deriving the same rules, the same reasoning `tally.ts`'s own header gives for
 * itself.
 */

import type { Dish, LunchFormat, Meal, PersonId, PlanItem, PlanOverride, Restaurant } from "../../shared/api";
import { LUNCH_FORMATS } from "./roster";

export interface SlotLabel {
  main: string;
  sub: string;
  /** true when this slot is a restaurant night ("Night off" badge in the mockup) */
  out: boolean;
  kind: "dish" | "shaak" | "rest" | null;
  /** The dish/restaurant id this slot resolves to, for freshness lookups. Null for a
   *  format-only lunch (e.g. Dal Dhokli) — there is nothing to have "last eaten". */
  id: string | null;
}

/** `weekStart` is not part of the key here — `items`/`overrides` already come scoped to one
 *  week from `/api/week/get`, so weekday+meal(+personId) is enough to find the row. */
export function findItem(items: readonly PlanItem[], weekday: number, meal: Meal): PlanItem | undefined {
  return items.find((it) => it.weekday === weekday && it.meal === meal);
}

export function findOverride(
  overrides: readonly PlanOverride[],
  weekday: number,
  meal: Meal,
  personId: PersonId,
): PlanOverride | undefined {
  return overrides.find((o) => o.weekday === weekday && o.meal === meal && o.personId === personId);
}

function fmtById(id: LunchFormat | null | undefined) {
  return LUNCH_FORMATS.find((f) => f.id === id) ?? LUNCH_FORMATS[0];
}

/**
 * What a slot's own card should render: the dish, the format-only lunch's name, or the
 * restaurant. Returns null when nothing has been decided yet (the empty-slot state).
 */
export function slotLabel(
  item: PlanItem | undefined,
  dishes: readonly Dish[],
  restaurants: readonly Restaurant[],
): SlotLabel | null {
  if (!item) return null;

  if (item.restaurantId) {
    const r = restaurants.find((x) => x.id === item.restaurantId);
    if (!r) return null;
    return {
      main: r.name,
      sub: r.note ? `${r.groupName} · ${r.note}` : r.groupName,
      out: true,
      kind: "rest",
      id: r.id,
    };
  }

  if (item.lunchFormat) {
    const f = fmtById(item.lunchFormat);
    if (!f.wantsShaak) return { main: f.name, sub: "The whole meal", out: false, kind: "shaak", id: null };
    const s = item.dishId ? dishes.find((d) => d.id === item.dishId) : undefined;
    return { main: s ? s.name : "Pick a shaak", sub: f.name, out: false, kind: "shaak", id: item.dishId ?? null };
  }

  const d = item.dishId ? dishes.find((x) => x.id === item.dishId) : undefined;
  return d ? { main: d.name, sub: d.cuisine ?? "", out: false, kind: "dish", id: d.id } : null;
}

/** The one-line text an eater chip shows for a person's override. */
export function overrideText(
  o: PlanOverride | undefined,
  dishes: readonly Dish[],
  restaurants: readonly Restaurant[],
): string {
  if (!o) return "";
  if (o.freeText) return o.freeText;
  if (o.restaurantId) return restaurants.find((r) => r.id === o.restaurantId)?.name ?? "—";
  if (o.lunchFormat && !fmtById(o.lunchFormat).wantsShaak) return fmtById(o.lunchFormat).name;
  const d = o.dishId ? dishes.find((x) => x.id === o.dishId) : undefined;
  return d?.name ?? "—";
}
