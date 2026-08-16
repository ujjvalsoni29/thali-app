import type {
  Dish,
  DishKind,
  LunchFormat,
  Meal,
  PersonId,
  PlanItem,
  PlanOverride,
  Restaurant,
  Theme,
  ThemeInk,
  ThemeKind,
  WhenKind,
} from "../../shared/api";

/**
 * `worker/lib/rows.ts` — snake_case → camelCase mapping, **once per table, not per route**
 * (tasks/step-04.md § 04a). D1 hands back rows shaped exactly like the SQL column list;
 * every route that reads a table imports the same mapper here rather than writing its own
 * `{ ... }` literal, so a column rename is a one-file fix.
 */

export interface ThemeRow {
  id: string;
  name: string;
  sub: string | null;
  icon: string | null;
  ink: string;
  kind: string;
  sort: number;
  archived: number;
}

export function rowToTheme(row: ThemeRow): Theme {
  return {
    id: row.id,
    name: row.name,
    sub: row.sub,
    icon: row.icon,
    ink: row.ink as ThemeInk,
    kind: row.kind as ThemeKind,
    sort: row.sort,
    archived: row.archived === 1,
  };
}

export interface DishRow {
  id: string;
  name: string;
  kind: string;
  cuisine: string | null;
  needs_dal: number;
  recipe_url: string | null;
  archived: number;
  created_at: string;
}

/**
 * `themeIds` is not a `dishes` column — it is the dish's rows from the `dish_themes` join
 * table. Callers pass the ids already grouped by `dish_id` (see `groupBy` below) so this
 * stays one query per table, never a join per dish.
 */
export function rowToDish(row: DishRow, themeIds: string[]): Dish {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as DishKind,
    cuisine: row.cuisine,
    needsDal: row.needs_dal === 1,
    recipeUrl: row.recipe_url,
    archived: row.archived === 1,
    createdAt: row.created_at,
    themeIds,
  };
}

export interface RestaurantRow {
  id: string;
  name: string;
  group_name: string;
  when_kind: string;
  note: string | null;
  url: string | null;
  archived: number;
  created_at: string;
}

export function rowToRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    groupName: row.group_name,
    whenKind: row.when_kind as WhenKind,
    note: row.note,
    url: row.url,
    archived: row.archived === 1,
    createdAt: row.created_at,
  };
}

export interface PlanItemRow {
  week_start: string;
  weekday: number;
  meal: string;
  dish_id: string | null;
  restaurant_id: string | null;
  lunch_format: string | null;
  note: string | null;
}

export function rowToPlanItem(row: PlanItemRow): PlanItem {
  return {
    weekStart: row.week_start,
    weekday: row.weekday,
    meal: row.meal as Meal,
    dishId: row.dish_id,
    restaurantId: row.restaurant_id,
    lunchFormat: row.lunch_format as LunchFormat | null,
    note: row.note,
  };
}

export interface PlanOverrideRow {
  week_start: string;
  weekday: number;
  meal: string;
  person_id: string;
  dish_id: string | null;
  restaurant_id: string | null;
  lunch_format: string | null;
  free_text: string | null;
}

export function rowToPlanOverride(row: PlanOverrideRow): PlanOverride {
  return {
    weekStart: row.week_start,
    weekday: row.weekday,
    meal: row.meal as Meal,
    personId: row.person_id as PersonId,
    dishId: row.dish_id,
    restaurantId: row.restaurant_id,
    lunchFormat: row.lunch_format as LunchFormat | null,
    freeText: row.free_text,
  };
}

export interface DishThemeRow {
  dish_id: string;
  theme_id: string;
}

/**
 * Groups rows by a string key, preserving encounter order — used to fold `dish_themes` rows
 * into each dish's `themeIds` without a query per dish (`week/get`'s one-batch rule,
 * tasks/step-04.md § 04b).
 */
export function groupBy<Row>(rows: Row[], key: (row: Row) => string): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}
