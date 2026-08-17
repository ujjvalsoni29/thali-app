import type { CSSProperties, ReactElement } from "react";
import { createPortal } from "react-dom";
import type { Meal, Theme, WeekState } from "../../shared/api";
import { findItem, findOverride, overrideText, slotLabel } from "../lib/slot";
import { weekTally } from "../lib/tally";
import { PEOPLE } from "../lib/roster";
import { DOWS, MONTHS, addDays, parse, pretty, servedOn } from "../lib/weeks";
import "../theme/poster.css";

/**
 * The "Share the week" printable poster — a portrait, one-page-per-week sheet meant to be
 * printed to PDF and dropped into the family WhatsApp thread. Ported VERBATIM from
 * `Main/thali-mockup.html`'s `posterHTML()` (source in tasks/step-11.md), adapted from the
 * mockup's globals (`S.ws`, `weekOf()`, `PEOPLE`, `esc()`, template-string HTML) to this
 * app's real data model and JSX, which auto-escapes text content so no `esc()` equivalent
 * is needed here.
 *
 * This is a SECOND layout of the same week `board.css`/`DayCard.tsx` already render — portrait,
 * for sending, not a restyle of the 7-across board (landscape, for browsing). Printing the
 * board page directly produces a bad PDF: wrong page shape, on-screen chrome that doesn't
 * belong on paper, a day split across a page break. `poster.css` (see its own header comment
 * for why `#poster` always renders in the light press regardless of the app's mode) is the
 * only stylesheet this component depends on for appearance — nothing here sets color or size
 * inline.
 *
 * Theme resolution mirrors `Week.tsx`'s own `week.themeRoster.find(...) ?? week.themeRoster[0]`
 * lookup exactly (no shared `themeById()` helper exists in this codebase — the mockup had one
 * only because it kept a flat in-memory theme list as a global). `slotLabel`/`findItem`/
 * `findOverride`/`overrideText` come from `src/lib/slot.ts` and `weekTally` from
 * `src/lib/tally.ts` rather than being re-derived here, per those files' own stated purpose
 * as the single source of truth for "what does this slot show" / "how do the tallies count".
 */

interface PosterCellProps {
  weekday: number;
  meal: Meal;
  week: WeekState;
}

function PosterCell(props: PosterCellProps): ReactElement {
  const { weekday, meal, week } = props;
  const item = findItem(week.items, weekday, meal);
  const label = slotLabel(item, week.dishes, week.restaurants);

  const ovRows = PEOPLE.map((person) => ({
    person,
    override: findOverride(week.overrides, weekday, meal, person.id),
  })).filter((row) => row.override);

  return (
    <div className="cell">
      <span className="lb">{meal === "lunch" ? "Lunch" : "Dinner"}</span>
      {label ? (
        <>
          {label.out ? <span className="out">Eating out</span> : null}
          <span className="nm">{label.main}</span>
          <span className="sb">{label.sub}</span>
        </>
      ) : (
        <span className="none">— not decided —</span>
      )}
      {/* only render the wrapper when there's at least one override for this slot — an
          empty `.ovs` still takes up layout space via its own margin-top, so this mirrors
          the mockup's `${ovs ? ... : ''}` conditional exactly rather than always rendering
          an (empty) wrapper */}
      {ovRows.length > 0 ? (
        <span className="ovs">
          {ovRows.map(({ person, override }) => (
            <span className="ov" key={person.id} style={{ "--pc": person.c } as CSSProperties}>
              <i>{person.ini}</i>
              {overrideText(override, week.dishes, week.restaurants)}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

export function Poster({ week }: { week: WeekState }): ReactElement {
  const a = parse(week.weekStart);
  const b = addDays(a, 6);
  const t = weekTally(week);

  const tallies: Array<{ n: string; c: string }> = [
    { n: `${t.filled} of 14 decided`, c: "var(--pink)" },
    ...(t.off ? [{ n: `${t.off} night${t.off === 1 ? "" : "s"} off`, c: "var(--marigold)" }] : []),
    ...(t.firsts ? [{ n: `${t.firsts} first-timer${t.firsts === 1 ? "" : "s"}`, c: "var(--grape)" }] : []),
    ...(t.ovs ? [{ n: `${t.ovs} custom plate${t.ovs === 1 ? "" : "s"}`, c: "var(--blue)" }] : []),
  ];

  return (
    <div id="poster">
      <div className="pmast">
        <svg className="mk" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="34" cy="34" r="23" fill="var(--pink)" opacity=".85" />
          <circle cx="32" cy="32" r="23" fill="var(--stock)" stroke="var(--ink)" strokeWidth="3.4" />
          <circle cx="32" cy="32" r="16.5" fill="none" stroke="var(--ink)" strokeWidth="1.5" opacity=".3" />
          <circle cx="32" cy="18.5" r="6" fill="var(--marigold)" stroke="var(--ink)" strokeWidth="2.6" />
          <circle cx="45.5" cy="32" r="6" fill="var(--teal)" stroke="var(--ink)" strokeWidth="2.6" />
          <circle cx="32" cy="45.5" r="6" fill="var(--blue)" stroke="var(--ink)" strokeWidth="2.6" />
          <circle cx="18.5" cy="32" r="6" fill="var(--tangerine)" stroke="var(--ink)" strokeWidth="2.6" />
          <circle cx="32" cy="32" r="4.6" fill="var(--ink)" />
        </svg>
        <div>
          <div>
            <span className="wm">Thali</span>
            <span className="guj">થાળી</span>
          </div>
          <div className="sub">What we're eating this week</div>
        </div>
        <div className="when">
          <b>
            {MONTHS[a.getMonth()]} {a.getDate()} – {MONTHS[b.getMonth()]} {b.getDate()}
          </b>
          <span>{a.getFullYear()}</span>
        </div>
      </div>

      {DOWS.map((_, weekday) => {
        const themeId = week.themes[weekday];
        const theme: Theme = week.themeRoster.find((th) => th.id === themeId) ?? week.themeRoster[0];
        const accent = `var(--${theme.ink})`;
        return (
          <div className="pday" key={weekday} style={{ "--accent": accent } as CSSProperties}>
            <div className="tab">
              <span className="d">{DOWS[weekday]}</span>
              <span className="dt">{pretty(servedOn(week.weekStart, weekday))}</span>
              <span className="th">
                {theme.icon ? `${theme.icon} ` : ""}
                {theme.name}
              </span>
            </div>
            <PosterCell weekday={weekday} meal="lunch" week={week} />
            <PosterCell weekday={weekday} meal="dinner" week={week} />
          </div>
        );
      })}

      <div className="pfoot">
        <span className="t">
          {tallies.map((x) => (
            <span className="tt" key={x.n} style={{ "--tc": x.c } as CSSProperties}>
              {x.n}
            </span>
          ))}
        </span>
        <span className="sig">Thali · થાળી</span>
      </div>
    </div>
  );
}

/**
 * Portals `<Poster>` to `document.body` — a sibling of `.shell`, not a descendant of it —
 * because `poster.css`'s `@media print` block hides `.shell` outright. If `#printroot`
 * nested inside `.shell` the way a plain child render would, hiding `.shell` for print
 * would hide the poster along with it and the "print to PDF" button would produce a blank
 * page. `week` is `undefined` until `/api/week/get` resolves, so this renders nothing
 * until there's a week to show.
 */
export function PrintRoot({ week }: { week: WeekState | undefined }): ReactElement | null {
  if (!week) return null;
  return createPortal(
    <div id="printroot" aria-hidden="true">
      <Poster week={week} />
    </div>,
    document.body,
  );
}
