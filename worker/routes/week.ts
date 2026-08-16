import type {
  Dish,
  PlanItem,
  PlanOverride,
  Restaurant,
  Theme,
  WeekClearBody,
  WeekGetBody,
  WeekState,
} from "../../shared/api";
import type { Env } from "../lib/env";
import { ok } from "../lib/http";
import type { DishRow, DishThemeRow, PlanItemRow, PlanOverrideRow, RestaurantRow, ThemeRow } from "../lib/rows";
import { groupBy, rowToDish, rowToPlanItem, rowToPlanOverride, rowToRestaurant, rowToTheme } from "../lib/rows";
import { parse, weekClearSchema, weekGetSchema } from "../schemas";

/** `served_on` for a table with a `?1`-bound `dish_id`/`restaurant_id` column — unions
 *  `plan_items` and `plan_overrides` (an override still counts as eaten) and excludes
 *  anything on or after the viewed week's Monday (Thali_Master.md § "Last Eaten"). Shared
 *  text so the dish and restaurant queries in `getWeek` cannot drift from each other. */
function lastEatenSql(idColumn: "dish_id" | "restaurant_id"): string {
  return `
    SELECT ${idColumn} AS id, MAX(served_on) AS lastEaten FROM (
      SELECT ${idColumn}, date(week_start, '+' || weekday || ' days') AS served_on FROM plan_items WHERE ${idColumn} IS NOT NULL
      UNION ALL
      SELECT ${idColumn}, date(week_start, '+' || weekday || ' days') AS served_on FROM plan_overrides WHERE ${idColumn} IS NOT NULL
    ) WHERE served_on < ?1
    GROUP BY ${idColumn}
  `;
}

/**
 * The default per-weekday theme assignment for a week with no (or a partial) `plan_themes`
 * row — computed on read, never written (`tasks/step-04.md` § 04b). The first seven themes
 * by `sort` ascending, from the non-archived roster, assigned positionally to weekday 0..6;
 * cycled with modulo if fewer than seven non-archived themes exist so every weekday still
 * gets some themeId. Empty roster (should never happen) yields `""` for every weekday.
 */
function defaultThemesByWeekday(themeRoster: Theme[]): string[] {
  const active = themeRoster.filter((t) => !t.archived).sort((a, b) => a.sort - b.sort);
  if (active.length === 0) return Array(7).fill("");
  return Array.from({ length: 7 }, (_, weekday) => active[weekday % active.length].id);
}

/**
 * `/api/week/get` — one `env.DB.batch()` (Thali_Master.md § API): the themes assigned per
 * weekday, the plan items, the overrides, the full dish/restaurant/theme rosters (archived
 * rows included — a past week must still be able to render a name), and the last-eaten map
 * for the whole roster, in a single round trip.
 */
export async function getWeek(env: Env, body: unknown): Promise<Response> {
  const { weekStart }: WeekGetBody = parse(weekGetSchema, body);

  const [
    planThemesResult,
    planItemsResult,
    planOverridesResult,
    dishesResult,
    restaurantsResult,
    themesResult,
    dishThemesResult,
    dishLastEatenResult,
    restaurantLastEatenResult,
  ] = await env.DB.batch([
    env.DB.prepare("SELECT weekday, theme_id FROM plan_themes WHERE week_start = ?1").bind(weekStart),
    env.DB.prepare("SELECT * FROM plan_items WHERE week_start = ?1").bind(weekStart),
    env.DB.prepare("SELECT * FROM plan_overrides WHERE week_start = ?1").bind(weekStart),
    env.DB.prepare("SELECT * FROM dishes"),
    env.DB.prepare("SELECT * FROM restaurants"),
    env.DB.prepare("SELECT * FROM themes ORDER BY sort ASC"),
    env.DB.prepare("SELECT dish_id, theme_id FROM dish_themes"),
    env.DB.prepare(lastEatenSql("dish_id")).bind(weekStart),
    env.DB.prepare(lastEatenSql("restaurant_id")).bind(weekStart),
  ]);

  const planThemeRows = (planThemesResult.results ?? []) as { weekday: number; theme_id: string }[];
  const dishThemesByDish = groupBy(dishThemesResult.results as DishThemeRow[], (row) => row.dish_id);

  const dishes: Dish[] = (dishesResult.results as DishRow[]).map((row) =>
    rowToDish(row, (dishThemesByDish.get(row.id) ?? []).map((r) => r.theme_id)),
  );
  const restaurants: Restaurant[] = (restaurantsResult.results as RestaurantRow[]).map(rowToRestaurant);
  const themeRoster: Theme[] = (themesResult.results as ThemeRow[]).map(rowToTheme);
  const items: PlanItem[] = (planItemsResult.results as PlanItemRow[]).map(rowToPlanItem);
  const overrides: PlanOverride[] = (planOverridesResult.results as PlanOverrideRow[]).map(rowToPlanOverride);

  const dishLastEaten = Object.fromEntries(
    (dishLastEatenResult.results as { id: string; lastEaten: string }[]).map((r) => [r.id, r.lastEaten]),
  );
  const restLastEaten = Object.fromEntries(
    (restaurantLastEatenResult.results as { id: string; lastEaten: string }[]).map((r) => [r.id, r.lastEaten]),
  );

  const defaults = defaultThemesByWeekday(themeRoster);
  const explicit = new Map(planThemeRows.map((row) => [row.weekday, row.theme_id]));
  const themes: string[] = Array.from({ length: 7 }, (_, weekday) => explicit.get(weekday) ?? defaults[weekday]);

  const weekState: WeekState = {
    weekStart,
    themes,
    items,
    overrides,
    dishes,
    restaurants,
    themeRoster,
    lastEaten: { dish: dishLastEaten, rest: restLastEaten },
  };

  return ok(weekState);
}

/**
 * `/api/week/clear` — deletes that week's items and overrides only. **Themes survive** —
 * clearing a week clears the meals, not the shape of the week (Thali_Master.md § Clearing a week).
 */
export async function clearWeek(env: Env, body: unknown): Promise<Response> {
  const { weekStart }: WeekClearBody = parse(weekClearSchema, body);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM plan_items WHERE week_start = ?1").bind(weekStart),
    env.DB.prepare("DELETE FROM plan_overrides WHERE week_start = ?1").bind(weekStart),
  ]);

  return ok({});
}
