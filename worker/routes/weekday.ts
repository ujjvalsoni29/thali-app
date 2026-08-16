import type { Env } from "../lib/env";
import { ok } from "../lib/http";
import { parse, weekdayThemeSetSchema } from "../schemas";

/** `/api/weekday/theme/set` — `{weekStart, weekday, themeId}`. Upserts the one
 *  `plan_themes` row for this `(week_start, weekday)` (its primary key) — themes move per
 *  week, so this is never a constant on the weekday (Thali_Master.md § Data Model). No FK
 *  to `themes`, same reasoning as `dish_themes`: `/api/theme/delete` owns reassigning every
 *  pointer to a deleted theme as part of its own transaction. */
export async function setWeekdayTheme(env: Env, body: unknown): Promise<Response> {
  const input = parse(weekdayThemeSetSchema, body);
  await env.DB.prepare(
    `INSERT INTO plan_themes (week_start, weekday, theme_id)
     VALUES (?1, ?2, ?3)
     ON CONFLICT(week_start, weekday) DO UPDATE SET theme_id = excluded.theme_id`,
  )
    .bind(input.weekStart, input.weekday, input.themeId)
    .run();
  return ok({});
}
