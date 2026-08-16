/**
 * The family roster, lunch formats, restaurant groups, meal "whens", and the ink-drum palette.
 * Ported verbatim from the approved mockup (`Main/thali-mockup.html`). These are deliberately
 * hard-coded here rather than a settings screen or a D1 table — see the project plan for step 05.
 *
 * Names are written as relation, not first name, on purpose ("Mom"/"Dad" rather than their given
 * names) — a deliberate privacy choice. Do not "helpfully" expand these.
 *
 * `id` fields are typed against the shared API's id unions so a typo here is a compile error,
 * not a silent drift between this roster and the worker/DB.
 */

import type { PersonId, LunchFormat, WhenKind } from "../../shared/api";

export interface Person {
  id: PersonId;
  name: string;
  ini: string;
  c: string;
}

export const PEOPLE: readonly Person[] = [
  { id: "ujjval", name: "Ujjval", ini: "U", c: "var(--p-ujjval)" },
  { id: "mansi", name: "Mansi", ini: "M", c: "var(--p-mansi)" },
  { id: "mom", name: "Mom", ini: "Mo", c: "var(--p-mom)" },
  { id: "dad", name: "Dad", ini: "D", c: "var(--p-dad)" },
  { id: "naisu", name: "Naisu", ini: "N", c: "var(--p-naisu)" },
];

/** The 8 ink-drum CSS custom-property names (bare, e.g. `"--marigold"` — not `var(...)`-wrapped). */
export const INKS: readonly string[] = [
  "--marigold",
  "--brick",
  "--leaf",
  "--blue",
  "--grape",
  "--pink",
  "--tangerine",
  "--teal",
];

export interface LunchFormatEntry {
  id: LunchFormat;
  name: string;
  wantsShaak: boolean;
  dal?: boolean;
}

export const LUNCH_FORMATS: readonly LunchFormatEntry[] = [
  { id: "full", name: "Rotli · Shaak · Dal · Bhaat", wantsShaak: true, dal: true },
  { id: "rotli-shaak", name: "Rotli · Shaak", wantsShaak: true },
  { id: "rotla-shaak", name: "Rotla · Shaak", wantsShaak: true },
  { id: "dal-dhokli", name: "Dal Dhokli", wantsShaak: false },
  { id: "khichdi", name: "Khichdi · Kadhi", wantsShaak: false },
  { id: "salad-chass", name: "Salad + Chass", wantsShaak: false },
];

export const REST_GROUPS: readonly string[] = [
  "Breakfast",
  "Snacks",
  "Fast Food",
  "Nearby",
  "San Jose",
  "San Francisco",
  "Try new",
];

export interface WhenEntry {
  id: WhenKind;
  n: string;
  c: string;
}

export const WHENS: readonly WhenEntry[] = [
  { id: "breakfast", n: "Breakfast", c: "--marigold" },
  { id: "lunch", n: "Lunch", c: "--teal" },
  { id: "dinner", n: "Dinner", c: "--blue" },
  { id: "snack", n: "Snacks", c: "--tangerine" },
  { id: "occasion", n: "Occasion", c: "--pink" },
];
