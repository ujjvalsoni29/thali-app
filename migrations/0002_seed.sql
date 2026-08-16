-- Thali — 0002_seed.sql
-- 7 themes, 11 shaaks, 34 dinner dishes, 26 restaurants, and the dish_themes join rows —
-- every value transcribed from Thali_Master.md § Dinner Themes / § Dish Roster /
-- § Restaurant Roster, cross-checked against the exact seed the mockup ships
-- (Main/thali-mockup.html SEED_THEMES / SEED_SHAAKS / SEED_DINNER / SEED_REST), which is
-- the same source step 01's answers were read out of.
--
-- Step 01 is closed (tasks/step-01.md) — all four previously-inferred values are
-- confirmed by Manc, all as guessed, so nothing below is seeded as an unconfirmed guess:
--   01a needs_dal split   — 8 dry shaaks want a dal, 3 legume shaaks stand alone
--   01b restaurant `when` — all 26 confirmed; only Besharam and Tiya are 'occasion'
--   01c 7th theme         — Street Night, accepted as proposed
--   01d week start        — Monday
--
-- Every row is vegetarian. No exceptions, no "example" rows (tasks/step-03.md § 2, 03c).
-- No plan_* seed data — v1 starts with an empty plan, same call Maximus made and for the
-- same reason: a fresh database should only ever see the current shape.
--
-- created_at is a fixed seed-time timestamp, not "now" — these rows were not created at
-- migration-apply time, they were transcribed on the date this migration was written.

-- ---------------------------------------------------------------------------------------
-- themes (7) — sort order matches the mockup's SEED_THEMES / a blank week's theme order.
-- ---------------------------------------------------------------------------------------
INSERT INTO themes (id, name, sub, icon, ink, kind, sort, archived) VALUES
  ('ghar',      'Ghar nu Jaman',   'Gujarati home food',    '🏠', 'marigold',  'dish', 0, 0),
  ('punjab',    'Punjab Express',  'Paneer & gravy night',  '🌶️', 'brick',     'dish', 1, 0),
  ('light',     'Light Lane',      'Lighter, greener',      '🥗', 'leaf',      'dish', 2, 0),
  ('passport',  'Passport Night',  'Anywhere but here',     '✈️', 'blue',      'dish', 3, 0),
  ('firsttime', 'First Time',      'Never made it before',  '✨', 'grape',     'dish', 4, 0),
  ('nightoff',  'Night Off',       'Nobody cooks',          '🍽️', 'pink',      'rest', 5, 0),
  ('street',    'Street Night',    'Chaat & handhelds',     '🚚', 'tangerine', 'dish', 6, 0);

-- ---------------------------------------------------------------------------------------
-- dishes — shaaks (11, kind='shaak'). needs_dal per step 01a, confirmed as guessed:
-- 8 dry shaaks want a dal alongside, 3 legume/gravy shaaks already are the dal.
-- Lunch has no themes, so none of these get a dish_themes row.
-- ---------------------------------------------------------------------------------------
INSERT INTO dishes (id, name, kind, cuisine, needs_dal, recipe_url, archived, created_at) VALUES
  ('mix-veg',    'Mix Veg',    'shaak', NULL, 1, NULL, 0, '2026-08-16T00:00:00Z'),
  ('guvar',      'Guvar',      'shaak', NULL, 1, NULL, 0, '2026-08-16T00:00:00Z'),
  ('bhinda',     'Bhinda',     'shaak', NULL, 1, NULL, 0, '2026-08-16T00:00:00Z'),
  ('tindora',    'Tindora',    'shaak', NULL, 1, NULL, 0, '2026-08-16T00:00:00Z'),
  ('karela',     'Karela',     'shaak', NULL, 1, NULL, 0, '2026-08-16T00:00:00Z'),
  ('parval',     'Parval',     'shaak', NULL, 1, NULL, 0, '2026-08-16T00:00:00Z'),
  ('kankoda',    'Kankoda',    'shaak', NULL, 1, NULL, 0, '2026-08-16T00:00:00Z'),
  ('cabbage',    'Cabbage',    'shaak', NULL, 1, NULL, 0, '2026-08-16T00:00:00Z'),
  ('choli',      'Choli',      'shaak', NULL, 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('chutti-dal', 'Chutti Dal', 'shaak', NULL, 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('mug-bhaat',  'Mug Bhaat',  'shaak', NULL, 0, NULL, 0, '2026-08-16T00:00:00Z');

-- ---------------------------------------------------------------------------------------
-- dishes — dinner (34, kind='dinner'). cuisine tags kept exactly as Manc had them, even
-- where debatable (Musaka filed Italian, Vadapav/Dosa filed Intl) — see Thali_Master.md
-- § Dish Roster. recipe_url is NULL on every row: First Time is empty by design and fills
-- up as things are actually tried, it does not get backfilled by a migration.
-- ---------------------------------------------------------------------------------------
INSERT INTO dishes (id, name, kind, cuisine, needs_dal, recipe_url, archived, created_at) VALUES
  ('stir-fry-paneer', 'Stir Fry Paneer & Rice',  'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('pulav',            'Pulav',                   'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('ragda-patis',       'Ragda Patis',             'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('palak-paneer',      'Palak Paneer',            'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('mix-veg-paratha',   'Mix Veg Paratha',         'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('chole',             'Chole',                   'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('punjabi-shaak',     'Punjabi Shaak',           'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('rajma-rice',        'Rajma & Rice',            'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('pav-bhaji',         'Pav Bhaji',               'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('dabeli',            'Dabeli',                  'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('dal-makhani',       'Dal Makhani',             'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('dal-fry-jeera',     'Dal Fry & Jeera Rice',    'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('dhokla',            'Dhokla',                  'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('bhakri-shaak',      'Bhakri Shaak',            'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('bataka-poha',       'Bataka Poha',             'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('aloo-paratha',      'Aloo Paratha',            'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('sabudana',          'Sabudana',                'dinner', 'Indian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('pasta',             'Pasta (White/Red)',       'dinner', 'Italian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('pizza',             'Pizza',                   'dinner', 'Italian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('musaka',            'Musaka',                  'dinner', 'Italian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('fried-rice',        'Fried Rice',              'dinner', 'Asian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('biryani',           'Biryani',                 'dinner', 'Asian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('hakka-noodles',     'Hakka Noodles',           'dinner', 'Asian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('garlic-noodles',    'Spicy Garlic Noodles',    'dinner', 'Asian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('manchurian',        'Manchurian',              'dinner', 'Asian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('thai-curry',        'Thai Curry',              'dinner', 'Asian', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('sandwich',          'Sandwich',                'dinner', 'Intl', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('vadapav',           'Vadapav',                 'dinner', 'Intl', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('dosa',              'Dosa',                    'dinner', 'Intl', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('falafel',           'Falafel',                 'dinner', 'Intl', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('burger',            'Burger',                  'dinner', 'Intl', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('thepla-suki',       'Thepla Suki Bhaji',       'dinner', 'Other', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('sev-tomato',        'Sev Tomato',              'dinner', 'Other', 0, NULL, 0, '2026-08-16T00:00:00Z'),
  ('khichdi-d',         'Khichdi',                 'dinner', 'Other', 0, NULL, 0, '2026-08-16T00:00:00Z');

-- ---------------------------------------------------------------------------------------
-- dish_themes — every dinner dish's theme assignment, read straight out of the mockup's
-- SEED_DINNER `th` arrays (the same readout step 01 used). A dish legitimately belongs to
-- several themes (e.g. Palak Paneer is both Punjab Express and Light Lane) — that is the
-- whole reason this is a join table and not a column.
-- ---------------------------------------------------------------------------------------
INSERT INTO dish_themes (dish_id, theme_id) VALUES
  ('stir-fry-paneer', 'punjab'),
  ('pulav', 'ghar'),
  ('ragda-patis', 'street'),
  ('palak-paneer', 'punjab'),
  ('palak-paneer', 'light'),
  ('mix-veg-paratha', 'ghar'),
  ('mix-veg-paratha', 'light'),
  ('chole', 'punjab'),
  ('punjabi-shaak', 'punjab'),
  ('rajma-rice', 'punjab'),
  ('pav-bhaji', 'street'),
  ('dabeli', 'street'),
  ('dal-makhani', 'punjab'),
  ('dal-fry-jeera', 'ghar'),
  ('dhokla', 'ghar'),
  ('dhokla', 'light'),
  ('bhakri-shaak', 'ghar'),
  ('bataka-poha', 'ghar'),
  ('bataka-poha', 'light'),
  ('aloo-paratha', 'ghar'),
  ('aloo-paratha', 'punjab'),
  ('sabudana', 'ghar'),
  ('pasta', 'passport'),
  ('pizza', 'passport'),
  ('musaka', 'passport'),
  ('fried-rice', 'passport'),
  ('biryani', 'passport'),
  ('hakka-noodles', 'passport'),
  ('garlic-noodles', 'passport'),
  ('manchurian', 'passport'),
  ('thai-curry', 'passport'),
  ('sandwich', 'light'),
  ('sandwich', 'street'),
  ('vadapav', 'street'),
  ('dosa', 'street'),
  ('falafel', 'passport'),
  ('falafel', 'light'),
  ('burger', 'passport'),
  ('thepla-suki', 'ghar'),
  ('thepla-suki', 'light'),
  ('sev-tomato', 'ghar'),
  ('sev-tomato', 'street'),
  ('khichdi-d', 'ghar'),
  ('khichdi-d', 'light');

-- ---------------------------------------------------------------------------------------
-- restaurants (26) — Manc's own groups verbatim, `when` per step 01b (confirmed as
-- guessed: only Besharam and Tiya are 'occasion', nothing is ever labelled "regular").
-- ---------------------------------------------------------------------------------------
INSERT INTO restaurants (id, name, group_name, when_kind, note, url, archived, created_at) VALUES
  ('black-bear',   'Black Bear Diner',    'Breakfast',      'breakfast', NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('dennys',       'Denny''s',            'Breakfast',      'breakfast', NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('ihop',         'IHOP',                'Breakfast',      'breakfast', NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('cracker',      'Cracker Barrel',      'Breakfast',      'breakfast', NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('dunkin',       'Dunkin''',            'Snacks',         'snack',     NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('senorita',     'Señorita Bread',      'Snacks',         'snack',     NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('dominos',      'Domino''s',           'Fast Food',      'dinner',    NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('in-n-out',     'In-N-Out',            'Fast Food',      'dinner',    NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('chipotle',     'Chipotle',            'Fast Food',      'lunch',     NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('panda',        'Panda Express',       'Fast Food',      'dinner',    NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('panera',       'Panera',              'Fast Food',      'lunch',     NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('olive-garden', 'Olive Garden',        'Nearby',         'dinner',    NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('curry-up',     'Curry Up Now',        'Nearby',         'dinner',    NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('ramen101',     'Ramen 101',           'Nearby',         'dinner',    'Concord', NULL, 0, '2026-08-16T00:00:00Z'),
  ('super-duper',  'Super Duper Burgers', 'Nearby',         'dinner',    NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('inchin',       'Inchin''s Bamboo',    'Nearby',         'dinner',    NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('chick-fil-a',  'Chick-fil-A',         'Nearby',         'dinner',    'Waffle fries, shakes, buffalo sauce, mac n cheese', NULL, 0, '2026-08-16T00:00:00Z'),
  ('thai-nearby',  'Thai',                'Nearby',         'dinner',    NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('drive-in-fal', 'Drive-In Falafel',    'San Jose',       'dinner',    NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('spice-klub',   'Spice Klub',          'San Jose',       'dinner',    NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('delhiwala',    'Delhiwala Chaat',     'San Jose',       'snack',     NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('madras-cafe',  'Madras Cafe',         'San Jose',       'dinner',    NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('honest',       'Honest',              'San Jose',       'dinner',    NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('besharam',     'Besharam',            'San Francisco',  'occasion',  NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('tiya',         'Tiya',                'San Francisco',  'occasion',  NULL, NULL, 0, '2026-08-16T00:00:00Z'),
  ('viks',         'Vik''s Chaat',        'Try new',        'lunch',     NULL, 'https://vikschaat.com/', 0, '2026-08-16T00:00:00Z');
