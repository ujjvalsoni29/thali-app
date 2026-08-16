import type { Env } from "../lib/env";
import { notImplemented } from "../lib/http";

/** `/api/restaurant/create` — `{name, groupName, whenKind, note?, url?}` → the created
 *  restaurant. `whenKind` is one column, not a meal column plus an occasion flag (Thali_Master.md § Restaurant Roster). */
export async function createRestaurant(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/restaurant/create");
}

/** `/api/restaurant/update` — `{id, name?, groupName?, whenKind?, note?, url?}`. */
export async function updateRestaurant(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/restaurant/update");
}

/** `/api/restaurant/archive` — `{id}`. Archived, never deleted (Thali_Master.md § Adding Things). */
export async function archiveRestaurant(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/restaurant/archive");
}
