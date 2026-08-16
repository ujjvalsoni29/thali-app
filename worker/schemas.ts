import { z } from "zod";
import { ApiError } from "./lib/http";
import { isValidIsoDate, mondayOf } from "./lib/dates";

/**
 * `worker/schemas.ts` — one zod `.strict()` schema per route body (tasks/step-04.md § 04a).
 * `.strict()` so an unexpected key is `BAD_INPUT` immediately, instead of a silently-dropped
 * value — the failure mode that would otherwise hide a renamed field until someone notices
 * data is missing.
 */

// ---- shared primitive schemas ---------------------------------------------------------

/**
 * ISO `YYYY-MM-DD` **and always a Monday** — a week is addressed by its Monday
 * (`Thali_Master.md` § The Week). `mondayOf(x) === x` is the round-trip that proves it; a
 * non-Monday key would fragment one week's plan across two keys.
 */
export const weekStartSchema = z
  .string()
  .refine(isValidIsoDate, { message: "must be a valid ISO date YYYY-MM-DD" })
  .refine((v) => mondayOf(v) === v, { message: "must be a Monday (the week's own key)" });

export const weekdaySchema = z.number().int().min(0).max(6);

export const mealSchema = z.enum(["lunch", "dinner"]);

/** The five-person family roster (`Thali_Master.md` § Family Roster). The roster is a code
 *  constant, not a settings screen, so it belongs in the schema, not a lookup table. */
export const PERSON_IDS = ["ujjval", "mansi", "mom", "dad", "naisu"] as const;
export const personIdSchema = z.enum(PERSON_IDS);

export const LUNCH_FORMATS = ["full", "rotli-shaak", "rotla-shaak", "dal-dhokli", "khichdi", "salad-chass"] as const;
export const lunchFormatSchema = z.enum(LUNCH_FORMATS);

export const DISH_KINDS = ["shaak", "dinner"] as const;
export const dishKindSchema = z.enum(DISH_KINDS);

export const WHEN_KINDS = ["breakfast", "lunch", "dinner", "snack", "occasion"] as const;
export const whenKindSchema = z.enum(WHEN_KINDS);

/** The eight ink drums — the same eight values as the `themes.ink` CHECK in
 *  `migrations/0001_init.sql` and the same eight drums in `src/theme/tokens.css`. */
export const THEME_INKS = ["pink", "marigold", "teal", "blue", "grape", "tangerine", "leaf", "brick"] as const;
export const themeInkSchema = z.enum(THEME_INKS);

const idSchema = z.string().min(1);

/** A non-empty, trimmed display string — `.min(1)` alone would still accept `"   "`. */
const nonEmptyString = z.string().trim().min(1);

// ---- route bodies -----------------------------------------------------------------------
// One schema per route, same order as worker/index.ts's switch. Body shapes are the
// authoritative ones from Thali_Master.md § API.

export const weekGetSchema = z.object({ weekStart: weekStartSchema }).strict();
export const weekClearSchema = z.object({ weekStart: weekStartSchema }).strict();

/** Enforces not-both-ids in the schema itself, so a violation is a readable `BAD_INPUT`
 *  rather than the DB's CHECK constraint firing as an opaque D1 error
 *  (tasks/step-04.md § 04c). Both absent is legal — a format-only lunch. */
export const slotSetSchema = z
  .object({
    weekStart: weekStartSchema,
    weekday: weekdaySchema,
    meal: mealSchema,
    dishId: idSchema.optional(),
    restaurantId: idSchema.optional(),
    lunchFormat: lunchFormatSchema.optional(),
  })
  .strict()
  .refine((body) => !(body.dishId && body.restaurantId), {
    message: "a slot cannot hold both a dish and a restaurant",
    path: ["dishId"],
  });

export const slotClearSchema = z
  .object({ weekStart: weekStartSchema, weekday: weekdaySchema, meal: mealSchema })
  .strict();

/** Same not-both-ids guard as `slotSetSchema`. Whether an all-empty body should DELETE
 *  instead of write is a *value* question (every field empty), not a *shape* question, so
 *  it is decided in `worker/routes/override.ts`, not here. */
export const overrideSetSchema = z
  .object({
    weekStart: weekStartSchema,
    weekday: weekdaySchema,
    meal: mealSchema,
    personId: personIdSchema,
    dishId: idSchema.optional(),
    restaurantId: idSchema.optional(),
    lunchFormat: lunchFormatSchema.optional(),
    freeText: z.string().optional(),
  })
  .strict()
  .refine((body) => !(body.dishId && body.restaurantId), {
    message: "an override cannot hold both a dish and a restaurant",
    path: ["dishId"],
  });

export const overrideClearSchema = z
  .object({ weekStart: weekStartSchema, weekday: weekdaySchema, meal: mealSchema, personId: personIdSchema })
  .strict();

export const weekdayThemeSetSchema = z
  .object({ weekStart: weekStartSchema, weekday: weekdaySchema, themeId: idSchema })
  .strict();

export const dishCreateSchema = z
  .object({
    name: nonEmptyString,
    kind: dishKindSchema,
    cuisine: nonEmptyString.optional(),
    needsDal: z.boolean().optional(),
    recipeUrl: nonEmptyString.optional(),
    themeIds: z.array(idSchema).optional(),
  })
  .strict();

export const dishUpdateSchema = z
  .object({
    id: idSchema,
    name: nonEmptyString.optional(),
    cuisine: nonEmptyString.optional(),
    needsDal: z.boolean().optional(),
    recipeUrl: nonEmptyString.optional(),
    themeIds: z.array(idSchema).optional(),
  })
  .strict();

/** The drag. `fromThemeId` absent = dragged out of Unassigned; `toThemeId` absent = dragged
 *  into it (tasks/step-04.md § 04e). */
export const dishThemesMoveSchema = z
  .object({ dishId: idSchema, fromThemeId: idSchema.optional(), toThemeId: idSchema.optional() })
  .strict();

export const dishArchiveSchema = z.object({ id: idSchema }).strict();

export const restaurantCreateSchema = z
  .object({
    name: nonEmptyString,
    groupName: nonEmptyString,
    whenKind: whenKindSchema,
    note: nonEmptyString.optional(),
    url: nonEmptyString.optional(),
  })
  .strict();

export const restaurantUpdateSchema = z
  .object({
    id: idSchema,
    name: nonEmptyString.optional(),
    groupName: nonEmptyString.optional(),
    whenKind: whenKindSchema.optional(),
    note: nonEmptyString.optional(),
    url: nonEmptyString.optional(),
  })
  .strict();

export const restaurantArchiveSchema = z.object({ id: idSchema }).strict();

export const themeCreateSchema = z
  .object({ name: nonEmptyString, sub: z.string(), icon: z.string(), ink: themeInkSchema })
  .strict();

export const themeUpdateSchema = z
  .object({
    id: idSchema,
    name: nonEmptyString.optional(),
    sub: z.string().optional(),
    icon: z.string().optional(),
    ink: themeInkSchema.optional(),
  })
  .strict();

export const themeDeleteSchema = z.object({ id: idSchema }).strict();

// ---- parse() ----------------------------------------------------------------------------

/**
 * Turns a zod failure into `ApiError('BAD_INPUT', <first issue path + message>)` — a caller
 * sees exactly which field was wrong instead of a generic 400 (tasks/step-04.md § 04a).
 */
export function parse<Schema extends z.ZodType>(schema: Schema, body: unknown): z.infer<Schema> {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const path = issue.path.length > 0 ? issue.path.join(".") : "(body)";
  throw new ApiError("BAD_INPUT", `${path}: ${issue.message}`);
}
