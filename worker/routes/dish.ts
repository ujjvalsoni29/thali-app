import type { Env } from "../lib/env";
import { notImplemented } from "../lib/http";

/** `/api/dish/create` — `{name, kind, cuisine?, needsDal?, recipeUrl?, themeIds?}` → the
 *  created dish. A new dish needs exactly one required field: its name (Thali_Master.md § Adding Things). */
export async function createDish(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/dish/create");
}

/** `/api/dish/update` — `{id, name?, cuisine?, needsDal?, recipeUrl?, themeIds?}` —
 *  `themeIds`, when present, replaces the `dish_themes` join rows wholesale. */
export async function updateDish(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/dish/update");
}

/** `/api/dish/themes/move` — `{dishId, fromThemeId?, toThemeId?}`, **the drag**: one delete
 *  plus one insert, so the dish's other themes survive the move (Thali_Master.md § Adding Things). */
export async function moveDishTheme(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/dish/themes/move");
}

/** `/api/dish/archive` — `{id}`. Archived, never deleted — a deleted dish would orphan
 *  every past plan row that points at it (Thali_Master.md § Adding Things). */
export async function archiveDish(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/dish/archive");
}
