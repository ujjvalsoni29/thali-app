import type { Env } from "../lib/env";
import { ok } from "../lib/http";
import { overrideClearSchema, overrideSetSchema, parse } from "../schemas";

/**
 * `POST /api/override/set` (`Thali_Master.md` § API, § Data Model).
 *
 * A `plan_overrides` row means "this person is eating something other than the plan" —
 * **absent means eating the plan**, always. There must never be a row that just restates
 * the plan; `plan_overrides` cannot be exactly-one-of-four-empty AND a real row at the same
 * time, so this handler is the one place that decides which of those two things a given
 * body is (tasks/step-03.md § 1, tasks/step-04.md § 04c).
 *
 * `overrideSetSchema` already rejects a body with both `dishId` and `restaurantId` set —
 * that half of the invariant is a shape question and lives in `worker/schemas.ts`. Whether
 * this body is "empty" is a *value* question, decided here: `dishId` / `restaurantId` /
 * `lunchFormat` are empty when `undefined`; `freeText` is empty when `undefined` or, after
 * `.trim()`, `""` — a body of nothing but whitespace must not survive as a phantom override.
 *
 * - All four empty: DELETE the row (a no-op if none exists) — this IS the
 *   absent-means-eating-the-plan rule, not a special case of it.
 * - Otherwise: upsert on the primary key `(week_start, weekday, meal, person_id)`, replacing
 *   every value column wholesale (an override is set as a whole row, never patched field by
 *   field — a caller who wants to keep the old `lunchFormat` must resend it).
 */
export async function setOverride(env: Env, body: unknown): Promise<Response> {
  const input = parse(overrideSetSchema, body);

  const trimmedFreeText = input.freeText?.trim();
  const isEmpty =
    input.dishId === undefined &&
    input.restaurantId === undefined &&
    input.lunchFormat === undefined &&
    (trimmedFreeText === undefined || trimmedFreeText === "");

  if (isEmpty) {
    await env.DB.prepare(
      `DELETE FROM plan_overrides WHERE week_start = ?1 AND weekday = ?2 AND meal = ?3 AND person_id = ?4`,
    )
      .bind(input.weekStart, input.weekday, input.meal, input.personId)
      .run();
    return ok({});
  }

  await env.DB.prepare(
    `INSERT INTO plan_overrides (week_start, weekday, meal, person_id, dish_id, restaurant_id, lunch_format, free_text)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
     ON CONFLICT(week_start, weekday, meal, person_id) DO UPDATE SET
       dish_id = excluded.dish_id,
       restaurant_id = excluded.restaurant_id,
       lunch_format = excluded.lunch_format,
       free_text = excluded.free_text`,
  )
    .bind(
      input.weekStart,
      input.weekday,
      input.meal,
      input.personId,
      input.dishId ?? null,
      input.restaurantId ?? null,
      input.lunchFormat ?? null,
      trimmedFreeText ? trimmedFreeText : null,
    )
    .run();

  return ok({});
}

/**
 * `POST /api/override/clear` (`Thali_Master.md` § API).
 *
 * Deletes the one `plan_overrides` row for `(weekStart, weekday, meal, personId)`, putting
 * that person back to eating the plan. A row that was already absent is not an error —
 * "already eating the plan" is the state this call is trying to reach, not a failure to
 * reach it — so this always returns `ok({})`, never `NOT_FOUND`.
 */
export async function clearOverride(env: Env, body: unknown): Promise<Response> {
  const input = parse(overrideClearSchema, body);

  await env.DB.prepare(
    `DELETE FROM plan_overrides WHERE week_start = ?1 AND weekday = ?2 AND meal = ?3 AND person_id = ?4`,
  )
    .bind(input.weekStart, input.weekday, input.meal, input.personId)
    .run();

  return ok({});
}
