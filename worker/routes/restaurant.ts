import type { Restaurant } from "../../shared/api";
import type { Env } from "../lib/env";
import { ApiError, ok } from "../lib/http";
import { rowToRestaurant } from "../lib/rows";
import type { RestaurantRow } from "../lib/rows";
import { parse, restaurantArchiveSchema, restaurantCreateSchema, restaurantUpdateSchema } from "../schemas";

/**
 * `POST /api/restaurant/create` (Thali_Master.md § API, tasks/step-04.md § 04d). The response
 * is built straight from the input, not a re-`SELECT` — we already know exactly what row we
 * just wrote.
 */
export async function createRestaurant(env: Env, body: unknown): Promise<Response> {
  const input = parse(restaurantCreateSchema, body);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString().slice(0, 10);

  await env.DB.prepare(
    "INSERT INTO restaurants (id, name, group_name, when_kind, note, url, archived, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
  )
    .bind(id, input.name, input.groupName, input.whenKind, input.note ?? null, input.url ?? null, createdAt)
    .run();

  const restaurant: Restaurant = rowToRestaurant({
    id,
    name: input.name,
    group_name: input.groupName,
    when_kind: input.whenKind,
    note: input.note ?? null,
    url: input.url ?? null,
    archived: 0,
    created_at: createdAt,
  });
  return ok(restaurant);
}

/**
 * `POST /api/restaurant/update` (Thali_Master.md § API, tasks/step-04.md § 04d). Only the
 * columns present in the body are written; if none are (besides `id`), skip the no-op UPDATE
 * and just confirm the row exists.
 */
export async function updateRestaurant(env: Env, body: unknown): Promise<Response> {
  const input = parse(restaurantUpdateSchema, body);

  const columns: string[] = [];
  const values: unknown[] = [];
  if (input.name !== undefined) {
    columns.push("name = ?");
    values.push(input.name);
  }
  if (input.groupName !== undefined) {
    columns.push("group_name = ?");
    values.push(input.groupName);
  }
  if (input.whenKind !== undefined) {
    columns.push("when_kind = ?");
    values.push(input.whenKind);
  }
  if (input.note !== undefined) {
    columns.push("note = ?");
    values.push(input.note);
  }
  if (input.url !== undefined) {
    columns.push("url = ?");
    values.push(input.url);
  }

  if (columns.length > 0) {
    const result = await env.DB.prepare(`UPDATE restaurants SET ${columns.join(", ")} WHERE id = ?`)
      .bind(...values, input.id)
      .run();
    if (result.meta.changes === 0) throw new ApiError("NOT_FOUND", `No such restaurant: ${input.id}`);
  } else {
    const existing = await env.DB.prepare("SELECT 1 FROM restaurants WHERE id = ?").bind(input.id).first();
    if (!existing) throw new ApiError("NOT_FOUND", `No such restaurant: ${input.id}`);
  }

  const row = await env.DB.prepare("SELECT * FROM restaurants WHERE id = ?").bind(input.id).first<RestaurantRow>();
  if (!row) throw new ApiError("NOT_FOUND", `No such restaurant: ${input.id}`);

  return ok(rowToRestaurant(row));
}

/**
 * `POST /api/restaurant/archive` (Thali_Master.md § API, tasks/step-04.md § 04d). Never a
 * real DELETE — a deleted restaurant would orphan every past `plan_items` row that points at
 * its id.
 */
export async function archiveRestaurant(env: Env, body: unknown): Promise<Response> {
  const input = parse(restaurantArchiveSchema, body);
  const result = await env.DB.prepare("UPDATE restaurants SET archived = 1 WHERE id = ?").bind(input.id).run();
  if (result.meta.changes === 0) throw new ApiError("NOT_FOUND", `No such restaurant: ${input.id}`);
  return ok({});
}
