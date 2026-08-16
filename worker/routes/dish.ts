import type { Dish } from "../../shared/api";
import type { Env } from "../lib/env";
import { ApiError, ok } from "../lib/http";
import { rowToDish } from "../lib/rows";
import type { DishRow, DishThemeRow } from "../lib/rows";
import { dishArchiveSchema, dishCreateSchema, dishThemesMoveSchema, dishUpdateSchema, parse } from "../schemas";

/**
 * `POST /api/dish/create` (Thali_Master.md § API, tasks/step-04.md § 04d). One batch: the
 * `dishes` insert plus one `dish_themes` insert per starting theme. The response is built
 * straight from the input, not a re-`SELECT` — we already know exactly what row we just wrote.
 */
export async function createDish(env: Env, body: unknown): Promise<Response> {
  const input = parse(dishCreateSchema, body);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString().slice(0, 10);
  const themeIds = input.themeIds ?? [];

  const statements = [
    env.DB.prepare(
      "INSERT INTO dishes (id, name, kind, cuisine, needs_dal, recipe_url, archived, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
    ).bind(id, input.name, input.kind, input.cuisine ?? null, input.needsDal ? 1 : 0, createdAt),
    ...themeIds.map((themeId) =>
      env.DB.prepare("INSERT INTO dish_themes (dish_id, theme_id) VALUES (?, ?)").bind(id, themeId),
    ),
  ];
  await env.DB.batch(statements);

  const dish: Dish = rowToDish(
    {
      id,
      name: input.name,
      kind: input.kind,
      cuisine: input.cuisine ?? null,
      needs_dal: input.needsDal ? 1 : 0,
      recipe_url: input.recipeUrl ?? null,
      archived: 0,
      created_at: createdAt,
    },
    themeIds,
  );
  return ok(dish);
}

/**
 * `POST /api/dish/update` (Thali_Master.md § API, tasks/step-04.md § 04d). Only the columns
 * present in the body are written. `themeIds`, when present, replaces the join rows wholesale
 * — the editor's multi-select is a full statement of membership, not a diff — never a merge.
 */
export async function updateDish(env: Env, body: unknown): Promise<Response> {
  const input = parse(dishUpdateSchema, body);

  const columns: string[] = [];
  const values: unknown[] = [];
  if (input.name !== undefined) {
    columns.push("name = ?");
    values.push(input.name);
  }
  if (input.cuisine !== undefined) {
    columns.push("cuisine = ?");
    values.push(input.cuisine);
  }
  if (input.needsDal !== undefined) {
    columns.push("needs_dal = ?");
    values.push(input.needsDal ? 1 : 0);
  }
  if (input.recipeUrl !== undefined) {
    columns.push("recipe_url = ?");
    values.push(input.recipeUrl);
  }

  const statements: D1PreparedStatement[] = [];
  if (columns.length > 0) {
    statements.push(env.DB.prepare(`UPDATE dishes SET ${columns.join(", ")} WHERE id = ?`).bind(...values, input.id));
  }
  if (input.themeIds !== undefined) {
    statements.push(env.DB.prepare("DELETE FROM dish_themes WHERE dish_id = ?").bind(input.id));
    for (const themeId of input.themeIds) {
      statements.push(env.DB.prepare("INSERT INTO dish_themes (dish_id, theme_id) VALUES (?, ?)").bind(input.id, themeId));
    }
  }

  if (statements.length > 0) {
    const results = await env.DB.batch(statements);
    if (columns.length > 0 && results[0].meta.changes === 0) {
      throw new ApiError("NOT_FOUND", `No such dish: ${input.id}`);
    }
  }

  // Existence must be confirmed even when only `dish_themes` rows were touched (or nothing
  // was touched at all) — a `dishes` UPDATE isn't guaranteed to have run above.
  if (columns.length === 0) {
    const existing = await env.DB.prepare("SELECT 1 FROM dishes WHERE id = ?").bind(input.id).first();
    if (!existing) throw new ApiError("NOT_FOUND", `No such dish: ${input.id}`);
  }

  const row = await env.DB.prepare("SELECT * FROM dishes WHERE id = ?").bind(input.id).first<DishRow>();
  if (!row) throw new ApiError("NOT_FOUND", `No such dish: ${input.id}`);
  const themeRows = await env.DB.prepare("SELECT dish_id, theme_id FROM dish_themes WHERE dish_id = ?")
    .bind(input.id)
    .all<DishThemeRow>();
  const themeIds = (themeRows.results ?? []).map((r) => r.theme_id);

  return ok(rowToDish(row, themeIds));
}

/**
 * `POST /api/dish/themes/move` (Thali_Master.md § API, tasks/step-04.md § 04e). The drag: one
 * delete plus one insert, so the dish's other themes survive. `fromThemeId` absent = dragged
 * out of Unassigned (nothing to delete); `toThemeId` absent = dragged into Unassigned
 * (nothing to insert). `INSERT OR IGNORE` so re-dragging onto a theme it's already in is a
 * no-op, not a PK violation.
 */
export async function moveDishTheme(env: Env, body: unknown): Promise<Response> {
  const input = parse(dishThemesMoveSchema, body);

  const statements: D1PreparedStatement[] = [];
  if (input.fromThemeId !== undefined) {
    statements.push(
      env.DB.prepare("DELETE FROM dish_themes WHERE dish_id = ? AND theme_id = ?").bind(input.dishId, input.fromThemeId),
    );
  }
  if (input.toThemeId !== undefined) {
    statements.push(
      env.DB.prepare("INSERT OR IGNORE INTO dish_themes (dish_id, theme_id) VALUES (?, ?)").bind(
        input.dishId,
        input.toThemeId,
      ),
    );
  }
  if (statements.length > 0) {
    await env.DB.batch(statements);
  }

  return ok({});
}

/**
 * `POST /api/dish/archive` (Thali_Master.md § API, tasks/step-04.md § 04d). Never a real
 * DELETE — a deleted dish would orphan every past `plan_items` row that points at its id.
 */
export async function archiveDish(env: Env, body: unknown): Promise<Response> {
  const input = parse(dishArchiveSchema, body);
  const result = await env.DB.prepare("UPDATE dishes SET archived = 1 WHERE id = ?").bind(input.id).run();
  if (result.meta.changes === 0) throw new ApiError("NOT_FOUND", `No such dish: ${input.id}`);
  return ok({});
}
