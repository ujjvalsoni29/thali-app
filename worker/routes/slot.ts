import type { Env } from "../lib/env";
import { notImplemented } from "../lib/http";

/** `/api/slot/set` — `{weekStart, weekday, meal, dishId?, restaurantId?, lunchFormat?}`
 *  (Thali_Master.md § API). A lunch format that takes no shaak legally has a null `dishId`. */
export async function setSlot(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/slot/set");
}

/** `/api/slot/clear` — `{weekStart, weekday, meal}`. Also deletes that slot's overrides,
 *  since an override without a slot to point at is orphaned data (Thali_Master.md § API). */
export async function clearSlot(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/slot/clear");
}
