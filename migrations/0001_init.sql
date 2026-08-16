-- Thali — 0001_init.sql
-- Six tables (Thali_Master.md § Data Model). Hand-written SQL, no ORM (plan §B).
--
-- The two constraints that carry all the risk (tasks/step-03.md § 1):
--   1. A slot holds AT MOST one of dish_id / restaurant_id, never both — and sometimes
--      neither ("Dal Dhokli" is a lunch_format with no dish_id, and that is legal). The
--      CHECK below is "not both set", not "exactly one set".
--   2. plan_overrides has no "same as everyone" row, ever — absent means eating the plan.
--      SQLite cannot enforce that; it is owned by the write path (step 04) and the UI
--      (step 08) instead.
--
-- served_on is never a column: it is derived as `week_start + weekday days`, computed at
-- read time, so it can never drift from the plan row it belongs to.

-- themes — user data, not content: Manc renames, re-inks and adds these from inside the
-- app (The Kitchen), same test that put dishes in D1 rather than a constant. kind='rest'
-- is the one behavioural flag: it swaps the picker's source list to restaurants; every
-- other column here is presentation. `ink` stores one of the eight drum NAMES, never a
-- hex — a hex column would let the seed data fork from src/theme/tokens.css the moment
-- one ink is nudged there.
CREATE TABLE themes (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  sub      TEXT,
  icon     TEXT,
  ink      TEXT NOT NULL CHECK (ink IN ('pink','marigold','teal','blue','grape','tangerine','leaf','brick')),
  kind     TEXT NOT NULL DEFAULT 'dish' CHECK (kind IN ('dish','rest')),
  sort     INTEGER NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0
);

-- dishes — also user data: Manc adds a dish from the picker at dinner time, and a code
-- deploy to record "we tried khandvi" would be absurd. kind='shaak' rows are the Gujarati
-- lunch roster; kind='dinner' rows are dinner-only. needs_dal only means something for
-- shaaks (a dry shaak wants a dal alongside; a legume shaak already is the dal) but lives
-- on every row rather than a second table, since it is a single flag, not a relationship.
-- Nothing is ever hard-deleted — see `archived` — because a delete would orphan every past
-- plan_items row that points at this id and take its history with it.
CREATE TABLE dishes (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('shaak','dinner')),
  cuisine    TEXT,
  needs_dal  INTEGER NOT NULL DEFAULT 0,
  recipe_url TEXT,
  archived   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- dish_themes — a dinner dish belongs to several themes, so this is a join table, not a
-- column. The drag-to-move semantics in The Kitchen (a dish dragged from one theme onto
-- another) are exactly a DELETE of one row plus an INSERT of another, which is why the
-- dish's other themes survive a move. Lunch shaaks never appear here — lunch has no
-- themes, stated by Manc, not inferred.
--
-- Deliberately NO foreign key to themes: /api/theme/delete already reassigns every
-- weekday pointer and drops this table's rows for the deleted theme as part of its own
-- transaction (worker/routes/theme.ts, step 04). An FK here would turn a recoverable UI
-- mistake into a 500 instead of leaving that invariant owned by the route, same reasoning
-- Thali_Master.md gives for plan_themes having no FK to themes.
CREATE TABLE dish_themes (
  dish_id  TEXT NOT NULL,
  theme_id TEXT NOT NULL,
  PRIMARY KEY (dish_id, theme_id)
);

-- restaurants — same shape and same "user data, archive don't delete" discipline as
-- dishes, different list. Used by the Night Off theme. when_kind is ONE column, not a
-- meal column plus an occasion flag: Occasion answers the same question the other four
-- values do ("when would we go here?") and simply outranks a meal slot — nobody drives to
-- Besharam because it's Tuesday lunch. Nothing is ever labelled "regular".
CREATE TABLE restaurants (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  group_name TEXT NOT NULL,
  when_kind  TEXT NOT NULL CHECK (when_kind IN ('breakfast','lunch','dinner','snack','occasion')),
  note       TEXT,
  url        TEXT,
  archived   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- plan_themes — which theme a given weekday carries, for one specific week. Themes move
-- per week (Thursday is not permanently "Passport Night"), so this cannot be a constant
-- on the weekday; it has to be a row keyed by week. There is no `plans` table anywhere in
-- this schema — a week is not an entity that gets created, it is a key, and rows in the
-- three plan_* tables are the only thing distinguishing a planned week from an empty one.
CREATE TABLE plan_themes (
  week_start TEXT NOT NULL,
  weekday    INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  theme_id   TEXT NOT NULL,
  PRIMARY KEY (week_start, weekday)
);

-- plan_items — the heart of it. One row per (week, weekday, meal); the common case for
-- the whole family. Exactly what "not both set" allows:
--   - a normal pick: exactly one of dish_id / restaurant_id set, lunch_format set for lunch
--   - a format-only lunch ("Dal Dhokli", khichdi, salad+chass): dish_id AND restaurant_id
--     both NULL, lunch_format carries the whole meal
--   - never legal: both dish_id and restaurant_id set on the same row
--
-- week_start is an ISO date and MUST be a Monday. SQLite cannot express "is a Monday" as a
-- CHECK against a text column without a full calendar function, so that half of the
-- invariant is owned by step 04's zod schema (src/lib/weeks.ts `mondayOf()` round-trip),
-- not by this migration.
CREATE TABLE plan_items (
  week_start    TEXT NOT NULL,
  weekday       INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  meal          TEXT NOT NULL CHECK (meal IN ('lunch','dinner')),
  dish_id       TEXT,
  restaurant_id TEXT,
  lunch_format  TEXT,
  note          TEXT,
  PRIMARY KEY (week_start, weekday, meal),
  CHECK ((dish_id IS NULL) + (restaurant_id IS NULL) >= 1)
);

-- plan_overrides — "this one person is eating something else instead of the plan". Same
-- one-of shape as plan_items, plus a one-off free_text field for the genuinely
-- unrepeatable ("just khichdi"). THE RULE THIS TABLE EXISTS TO ENFORCE, AND CANNOT: a row
-- here means someone is customising; there is no "same as everyone" row, ever. A meal
-- nobody customised must write ZERO override rows, not five (one per person) — that is
-- the exact bug this schema cannot stop by itself. It is owned by step 04's write path
-- and must not be tempted into existing by step 08's UI (tasks/step-03.md § 1).
CREATE TABLE plan_overrides (
  week_start    TEXT NOT NULL,
  weekday       INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  meal          TEXT NOT NULL CHECK (meal IN ('lunch','dinner')),
  person_id     TEXT NOT NULL,
  dish_id       TEXT,
  restaurant_id TEXT,
  lunch_format  TEXT,
  free_text     TEXT,
  PRIMARY KEY (week_start, weekday, meal, person_id),
  CHECK ((dish_id IS NULL) + (restaurant_id IS NULL) >= 1)
);

-- The last-eaten GROUP BY (`SELECT dish_id, MAX(served_on) ... GROUP BY dish_id`, the
-- query that is the entire reason this app is D1 and not localStorage) reads plan_items
-- by dish_id or restaurant_id on every single board load. It is the app's hottest query,
-- named as such in tasks/step-03.md § 2 (03b) — index both columns.
CREATE INDEX idx_plan_items_dish_id ON plan_items (dish_id);
CREATE INDEX idx_plan_items_restaurant_id ON plan_items (restaurant_id);
