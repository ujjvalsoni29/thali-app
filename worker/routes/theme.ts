import type { Env } from "../lib/env";
import { ApiError, ok } from "../lib/http";
import { rowToTheme, type ThemeRow } from "../lib/rows";
import { parse, themeCreateSchema, themeDeleteSchema, themeUpdateSchema } from "../schemas";

/** `/api/theme/create` — `{name, sub, icon, ink}` → the created theme. `ink` stores a drum
 *  name, not a hex — the eight drums live in `src/theme/tokens.css` (Thali_Master.md § Data Model).
 *  Always `kind = 'dish'` — v1 has no route that creates a `rest`-kind theme. `sort` is
 *  appended after the current max. */
export async function createTheme(env: Env, body: unknown): Promise<Response> {
  const input = parse(themeCreateSchema, body);

  const maxSortRow = await env.DB.prepare("SELECT COALESCE(MAX(sort), -1) AS maxSort FROM themes").first<{
    maxSort: number;
  }>();
  const sort = (maxSortRow?.maxSort ?? -1) + 1;

  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO themes (id, name, sub, icon, ink, kind, sort, archived) VALUES (?1, ?2, ?3, ?4, ?5, 'dish', ?6, 0)",
  )
    .bind(id, input.name, input.sub, input.icon, input.ink, sort)
    .run();

  const row: ThemeRow = {
    id,
    name: input.name,
    sub: input.sub,
    icon: input.icon,
    ink: input.ink,
    kind: "dish",
    sort,
    archived: 0,
  };
  return ok(rowToTheme(row));
}

/** `/api/theme/update` — `{id, name?, sub?, icon?, ink?}`. Only the fields present in the
 *  body are written; an all-absent body is a no-op existence check. */
export async function updateTheme(env: Env, body: unknown): Promise<Response> {
  const input = parse(themeUpdateSchema, body);

  const fields: string[] = [];
  const params: unknown[] = [];
  if (input.name !== undefined) {
    fields.push("name = ?");
    params.push(input.name);
  }
  if (input.sub !== undefined) {
    fields.push("sub = ?");
    params.push(input.sub);
  }
  if (input.icon !== undefined) {
    fields.push("icon = ?");
    params.push(input.icon);
  }
  if (input.ink !== undefined) {
    fields.push("ink = ?");
    params.push(input.ink);
  }

  if (fields.length > 0) {
    params.push(input.id);
    const { meta } = await env.DB.prepare(`UPDATE themes SET ${fields.join(", ")} WHERE id = ?`)
      .bind(...params)
      .run();
    if (meta.changes === 0) throw new ApiError("NOT_FOUND", "No such theme: " + input.id);
  }

  const row = await env.DB.prepare("SELECT * FROM themes WHERE id = ?").bind(input.id).first<ThemeRow>();
  if (!row) throw new ApiError("NOT_FOUND", "No such theme: " + input.id);
  return ok(rowToTheme(row));
}

/** `/api/theme/delete` — `{id}`. Reassigns any weekday pointing at it to the first
 *  remaining theme and drops its `dish_themes` rows. **Refuses if fewer than 3 themes
 *  remain** (Thali_Master.md § API). */
export async function deleteTheme(env: Env, body: unknown): Promise<Response> {
  const input = parse(themeDeleteSchema, body);

  const { results: list } = await env.DB.prepare("SELECT id, sort FROM themes ORDER BY sort ASC").all<{
    id: string;
    sort: number;
  }>();

  if (!list.some((theme) => theme.id === input.id)) {
    throw new ApiError("NOT_FOUND", "No such theme: " + input.id);
  }
  if (list.length - 1 < 3) {
    throw new ApiError("BAD_INPUT", "At least 3 themes must remain.");
  }

  const survivor = list.find((theme) => theme.id !== input.id);
  if (!survivor) throw new ApiError("NOT_FOUND", "No such theme: " + input.id);

  await env.DB.batch([
    env.DB.prepare("UPDATE plan_themes SET theme_id = ? WHERE theme_id = ?").bind(survivor.id, input.id),
    env.DB.prepare("DELETE FROM dish_themes WHERE theme_id = ?").bind(input.id),
    env.DB.prepare("DELETE FROM themes WHERE id = ?").bind(input.id),
  ]);

  return ok({});
}
