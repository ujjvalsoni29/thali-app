import type { Env } from "../lib/env";
import { notImplemented } from "../lib/http";

/** `/api/theme/create` — `{name, sub, icon, ink}` → the created theme. `ink` stores a drum
 *  name, not a hex — the eight drums live in `src/theme/tokens.css` (Thali_Master.md § Data Model). */
export async function createTheme(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/theme/create");
}

/** `/api/theme/update` — `{id, name?, sub?, icon?, ink?}`. */
export async function updateTheme(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/theme/update");
}

/** `/api/theme/delete` — `{id}`. Reassigns any weekday pointing at it to the first
 *  remaining theme and drops its `dish_themes` rows. **Refuses if fewer than 3 themes
 *  remain** (Thali_Master.md § API). */
export async function deleteTheme(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/theme/delete");
}
