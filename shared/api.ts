/**
 * The API contract, shared by the Worker and the React app.
 *
 * Every endpoint is POST with a JSON body; every response is exactly one of the two
 * envelope shapes below (Thali_Master.md § API). Seventeen routes plus the bodyless
 * `/api/health`; every one of the seventeen is filled in `worker/routes/*.ts` (step 04),
 * validated by the zod `.strict()` schemas in `worker/schemas.ts`.
 *
 * Domain wire types below are the request/response shape of each route, land here (not in
 * `worker/schemas.ts`) because the React app needs them too and `shared/` is the one
 * directory both `tsconfig.app.json` and `tsconfig.worker.json` include.
 */

export type ErrorCode = "BAD_INPUT" | "NOT_FOUND" | "UNAUTHORIZED" | "NOT_IMPLEMENTED" | "INTERNAL";

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } };

// ---- domain enums -------------------------------------------------------------------------
// Same value sets as the CHECKs in migrations/0001_init.sql and the zod schemas in
// worker/schemas.ts that validate against them — one of those three drifting from the other
// two is exactly the bug `.strict()` schemas exist to catch early.

/** The eight ink drums — `src/theme/tokens.css` owns the actual colors; this table only
 *  ever stores the drum's name (Thali_Master.md § Data Model). */
export type ThemeInk = "pink" | "marigold" | "teal" | "blue" | "grape" | "tangerine" | "leaf" | "brick";

/** `rest` swaps a theme's picker source list to restaurants — the one behavioural flag on
 *  an otherwise-presentational row. Themes created via `/api/theme/create` are always `dish`;
 *  v1 has no route that makes a new `rest`-kind theme. */
export type ThemeKind = "dish" | "rest";

export type DishKind = "shaak" | "dinner";

export type Meal = "lunch" | "dinner";

/** `when_kind` is one column, not a meal column plus an occasion flag (Thali_Master.md §
 *  Restaurant Roster) — `occasion` outranks every meal value. */
export type WhenKind = "breakfast" | "lunch" | "dinner" | "snack" | "occasion";

/** The five-person family roster (Thali_Master.md § Family Roster) — a code constant, not a
 *  settings screen, so it is a union here rather than a lookup table. */
export type PersonId = "ujjval" | "mansi" | "mom" | "dad" | "naisu";

export type LunchFormat = "full" | "rotli-shaak" | "rotla-shaak" | "dal-dhokli" | "khichdi" | "salad-chass";

// ---- domain entities -----------------------------------------------------------------------

export interface Theme {
  id: string;
  name: string;
  sub: string | null;
  icon: string | null;
  ink: ThemeInk;
  kind: ThemeKind;
  sort: number;
  archived: boolean;
}

/** `themeIds` is not a `dishes` column — it is the dish's rows from the `dish_themes` join
 *  table, folded in by `worker/lib/rows.ts`'s `rowToDish()`. A dinner dish belongs to several
 *  themes; lunch shaaks always have an empty `themeIds` (lunch has no themes). */
export interface Dish {
  id: string;
  name: string;
  kind: DishKind;
  cuisine: string | null;
  needsDal: boolean;
  recipeUrl: string | null;
  archived: boolean;
  createdAt: string;
  themeIds: string[];
}

export interface Restaurant {
  id: string;
  name: string;
  groupName: string;
  whenKind: WhenKind;
  note: string | null;
  url: string | null;
  archived: boolean;
  createdAt: string;
}

/** One slot: a Monday-keyed week, a weekday (0=Mon..6=Sun) and a meal. Exactly one of
 *  `dishId` / `restaurantId` is set, or — a format-only lunch like Dal Dhokli — neither. */
export interface PlanItem {
  weekStart: string;
  weekday: number;
  meal: Meal;
  dishId: string | null;
  restaurantId: string | null;
  lunchFormat: LunchFormat | null;
  note: string | null;
}

/** A row here means one person is eating something other than the plan for that slot.
 *  **Absent = eating the plan** — there is no "same as everyone" row, ever. */
export interface PlanOverride {
  weekStart: string;
  weekday: number;
  meal: Meal;
  personId: PersonId;
  dishId: string | null;
  restaurantId: string | null;
  lunchFormat: LunchFormat | null;
  freeText: string | null;
}

/**
 * Everything `/api/week/get` returns — the whole board in one round trip
 * (`Thali_Master.md` § API). `dishes` / `restaurants` / `themeRoster` are the FULL rosters,
 * archived rows included, so a past week can still render the name of something since
 * archived — the picker is what filters `archived`, not this payload.
 */
export interface WeekState {
  weekStart: string;
  /** The theme assigned to each weekday, index 0 (Monday) through 6 (Sunday). Never null —
   *  a week with no `plan_themes` rows gets the default assignment computed on read, not
   *  written (tasks/step-04.md § 04b). */
  themes: string[];
  items: PlanItem[];
  overrides: PlanOverride[];
  dishes: Dish[];
  restaurants: Restaurant[];
  themeRoster: Theme[];
  /** `MAX(served_on)` per id, unioned across `plan_items` and `plan_overrides` — an override
   *  still counts as having eaten it — and excluding anything dated on or after `weekStart`
   *  (Thali_Master.md § "Last Eaten": a meal planned for Friday is not evidence you ate it). */
  lastEaten: { dish: Record<string, string>; rest: Record<string, string> };
}

// ---- route bodies ---------------------------------------------------------------------------
// `Thali_Master.md` § API has the authoritative Body → Data table; these types are its
// TypeScript shape, one per route, in the same order as worker/index.ts's switch.

export interface WeekGetBody {
  weekStart: string;
}
export interface WeekClearBody {
  weekStart: string;
}

export interface SlotSetBody {
  weekStart: string;
  weekday: number;
  meal: Meal;
  dishId?: string;
  restaurantId?: string;
  lunchFormat?: LunchFormat;
}
export interface SlotClearBody {
  weekStart: string;
  weekday: number;
  meal: Meal;
}

export interface OverrideSetBody {
  weekStart: string;
  weekday: number;
  meal: Meal;
  personId: PersonId;
  dishId?: string;
  restaurantId?: string;
  lunchFormat?: LunchFormat;
  freeText?: string;
}
export interface OverrideClearBody {
  weekStart: string;
  weekday: number;
  meal: Meal;
  personId: PersonId;
}

export interface WeekdayThemeSetBody {
  weekStart: string;
  weekday: number;
  themeId: string;
}

export interface DishCreateBody {
  name: string;
  kind: DishKind;
  cuisine?: string;
  needsDal?: boolean;
  recipeUrl?: string;
  themeIds?: string[];
}
export interface DishUpdateBody {
  id: string;
  name?: string;
  cuisine?: string;
  needsDal?: boolean;
  recipeUrl?: string;
  themeIds?: string[];
}
export interface DishThemesMoveBody {
  dishId: string;
  fromThemeId?: string;
  toThemeId?: string;
}
export interface DishArchiveBody {
  id: string;
}

export interface RestaurantCreateBody {
  name: string;
  groupName: string;
  whenKind: WhenKind;
  note?: string;
  url?: string;
}
export interface RestaurantUpdateBody {
  id: string;
  name?: string;
  groupName?: string;
  whenKind?: WhenKind;
  note?: string;
  url?: string;
}
export interface RestaurantArchiveBody {
  id: string;
}

export interface ThemeCreateBody {
  name: string;
  sub: string;
  icon: string;
  ink: ThemeInk;
}
export interface ThemeUpdateBody {
  id: string;
  name?: string;
  sub?: string;
  icon?: string;
  ink?: ThemeInk;
}
export interface ThemeDeleteBody {
  id: string;
}
