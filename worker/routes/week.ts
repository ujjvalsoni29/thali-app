import type { Env } from "../lib/env";
import { notImplemented } from "../lib/http";

/**
 * `/api/week/get` — step 04 fills this in as **one `env.DB.batch()`** (Thali_Master.md § API):
 * the themes assigned per weekday, the plan items, the overrides, the full dish/restaurant/
 * theme rosters, and the last-eaten map for the whole roster in a single round trip.
 */
export async function getWeek(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/week/get");
}

/**
 * `/api/week/clear` — deletes that week's items and overrides only. **Themes survive** —
 * clearing a week clears the meals, not the shape of the week (Thali_Master.md § Clearing a week).
 */
export async function clearWeek(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/week/clear");
}
