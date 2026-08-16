import type { Env } from "../lib/env";
import { notImplemented } from "../lib/http";

/** `/api/weekday/theme/set` — `{weekStart, weekday, themeId}`, an upsert into `plan_themes`
 *  (Thali_Master.md § Data Model). Themes are per week, so this is how a week gets shuffled. */
export async function setWeekdayTheme(_env: Env, _body: unknown): Promise<Response> {
  return notImplemented("/api/weekday/theme/set");
}
