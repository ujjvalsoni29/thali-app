/**
 * WhatsApp attaches a PDF as a file but renders plain text inline in the chat — for a quick
 * "here's the week" message the text version is the better artefact, not a lesser fallback to
 * the printable poster PDF (built by a sibling component). Ported from
 * `Main/thali-mockup.html`'s `weekText()` / `copyWeekText()`, adapted to the real `WeekState`
 * shape: flat `items` / `overrides` arrays plus the `findItem` / `findOverride` / `slotLabel` /
 * `overrideText` lookup helpers, instead of the mockup's `S`/`w` globals keyed by `"wd:meal"`
 * template strings.
 */

import type { WeekState } from "../../shared/api";
import { findItem, findOverride, overrideText, slotLabel } from "../lib/slot";
import { DOWS, MONTHS, addDays, parse, pretty, servedOn } from "../lib/weeks";
import { weekTally } from "../lib/tally";
import { PEOPLE } from "../lib/roster";

const MEALS = ["lunch", "dinner"] as const;

export function weekText(week: WeekState): string {
  const a = parse(week.weekStart);
  const b = addDays(a, 6);
  const lines: string[] = [
    `*Thali — ${MONTHS[a.getMonth()]} ${a.getDate()}–${MONTHS[b.getMonth()]} ${b.getDate()}*`,
    "",
  ];

  for (let weekday = 0; weekday < 7; weekday++) {
    const theme = week.themeRoster.find((t) => t.id === week.themes[weekday]) ?? week.themeRoster[0];
    const icon = theme.icon ? `${theme.icon} ` : "";
    lines.push(`*${DOWS[weekday]} ${pretty(servedOn(week.weekStart, weekday))}* — ${icon}${theme.name}`);

    for (const meal of MEALS) {
      const item = findItem(week.items, weekday, meal);
      const label = slotLabel(item, week.dishes, week.restaurants);
      const cap = meal === "lunch" ? "Lunch" : "Dinner";
      lines.push(
        label
          ? `  ${cap}: ${label.main}${label.out ? " (eating out)" : ""}${label.sub && !label.out ? ` — ${label.sub}` : ""}`
          : `  ${cap}: not decided`,
      );
      for (const person of PEOPLE) {
        const o = findOverride(week.overrides, weekday, meal, person.id);
        if (o) lines.push(`     ↳ ${person.name}: ${overrideText(o, week.dishes, week.restaurants)}`);
      }
    }
    lines.push("");
  }

  const t = weekTally(week);
  lines.push(`${t.filled}/14 decided${t.off ? ` · ${t.off} night${t.off === 1 ? "" : "s"} off` : ""}`);
  return lines.join("\n");
}

export function copyWeekText(week: WeekState, onDone: (message: string) => void): void {
  const txt = weekText(week);
  const done = () => onDone("Copied — paste it straight into the group chat.");
  const fail = () => onDone("Could not reach the clipboard.");

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(done, fail);
  } else {
    const ta = document.createElement("textarea");
    ta.value = txt;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } catch {
      fail();
    }
    ta.remove();
  }
}
