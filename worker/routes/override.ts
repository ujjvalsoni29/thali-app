import type { Env } from "../lib/env";
import { notImplemented } from "../lib/http";

/** `/api/override/set` — `{weekStart, weekday, meal, personId, dishId?, restaurantId?,
 *  lunchFormat?, freeText?}`. **An empty payload deletes rather than writes** — the only
 *  place absent-means-eating-the-plan can be guaranteed (Thali_Master.md § Data Model). */
export async function setOverride(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/override/set");
}

/** `/api/override/clear` — `{weekStart, weekday, meal, personId}`. Deletes the row; the
 *  person goes back to eating the plan (Thali_Master.md § Per-person overrides). */
export async function clearOverride(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/override/clear");
}
