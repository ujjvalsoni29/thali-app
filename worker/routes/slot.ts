import type { Env } from "../lib/env";
import { ok } from "../lib/http";
import { parse, slotClearSchema, slotSetSchema } from "../schemas";

/** `/api/slot/set` — `{weekStart, weekday, meal, dishId?, restaurantId?, lunchFormat?}`.
 *  Upserts the one `plan_items` row for this `(week_start, weekday, meal)` (its primary
 *  key). Not-both-ids is already enforced by `slotSetSchema`'s `.refine()` — both absent is
 *  legal, a format-only lunch like Dal Dhokli has no `dishId` (Thali_Master.md § Data
 *  Model). Deliberately never touches `note` — it is not part of this route's body shape
 *  (Thali_Master.md § API), so it is left out of the column list entirely: `NULL` on
 *  insert, untouched by `DO UPDATE SET` on conflict. */
export async function setSlot(env: Env, body: unknown): Promise<Response> {
  const input = parse(slotSetSchema, body);
  await env.DB.prepare(
    `INSERT INTO plan_items (week_start, weekday, meal, dish_id, restaurant_id, lunch_format)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(week_start, weekday, meal) DO UPDATE SET
       dish_id = excluded.dish_id,
       restaurant_id = excluded.restaurant_id,
       lunch_format = excluded.lunch_format`,
  )
    .bind(
      input.weekStart,
      input.weekday,
      input.meal,
      input.dishId ?? null,
      input.restaurantId ?? null,
      input.lunchFormat ?? null,
    )
    .run();
  return ok({});
}

/** `/api/slot/clear` — `{weekStart, weekday, meal}`. Deletes the `plan_items` row for this
 *  slot, plus every `plan_overrides` row for the same slot — an override pointing at a plan
 *  that no longer exists is orphaned state, not history worth keeping. Both deletes run in
 *  one `env.DB.batch()` so the slot and its overrides disappear atomically. A slot with
 *  nothing planned is a no-op success, not `NOT_FOUND` (Thali_Master.md § API). */
export async function clearSlot(env: Env, body: unknown): Promise<Response> {
  const input = parse(slotClearSchema, body);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM plan_items WHERE week_start = ?1 AND weekday = ?2 AND meal = ?3").bind(
      input.weekStart,
      input.weekday,
      input.meal,
    ),
    env.DB.prepare("DELETE FROM plan_overrides WHERE week_start = ?1 AND weekday = ?2 AND meal = ?3").bind(
      input.weekStart,
      input.weekday,
      input.meal,
    ),
  ]);
  return ok({});
}
