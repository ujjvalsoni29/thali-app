import type { CSSProperties, ReactElement } from "react";
import type { Meal, PersonId, WeekState } from "../../shared/api";
import { Sheet } from "./Sheet";
import { DOWS, pretty, servedOn } from "../lib/weeks";
import { findItem, findOverride, overrideText, slotLabel } from "../lib/slot";
import { PEOPLE } from "../lib/roster";
import { useClearOverride } from "../lib/queries";

/**
 * The "roster sheet" — lists the five family members for one slot (a weekday+meal) and lets
 * you see/set/clear each person's override. Ported VERBATIM from `Main/thali-mockup.html`'s
 * `openOverrides(wd, meal)` (~lines 1117-1136) — plan §1a: mockup first, then the app.
 *
 * Absent = eating the plan: a person with no override row just reads "eating the plan" here,
 * the same "absent means the default" rule `EaterChips.tsx` already documents for its own
 * chip row. The picker itself is NOT reimplemented in this file — "Pick…"/"Change" only report
 * the click via `onPick`; the caller (`Week.tsx`) is the one that opens the real `MealPicker`
 * in person mode (`forPerson` set), reused verbatim, per `tasks/step-08.md` §1: "The picker is
 * reused verbatim". Only "Clear" is a real mutation here (`useClearOverride`) — clicking it
 * deletes the override row and lets this same sheet re-render in place from the invalidated
 * week query, matching the mockup's `data-ovclear` handler.
 */
export interface OverridesSheetProps {
  open: boolean;
  weekday: number;
  meal: Meal;
  weekStart: string;
  week: WeekState;
  onClose(): void;
  /** "Pick…" or "Change" was clicked for this person — the caller (Week.tsx) opens
   *  MealPicker with forPerson set to this id. You do not open the picker yourself. */
  onPick(personId: PersonId): void;
}

export function OverridesSheet(props: OverridesSheetProps): ReactElement {
  const { open, weekday, meal, weekStart, week, onClose, onPick } = props;
  const clearOverride = useClearOverride();

  const date = servedOn(weekStart, weekday);
  const eyebrow = `${DOWS[weekday]} · ${pretty(date)} · ${meal}`;
  const L = slotLabel(findItem(week.items, weekday, meal), week.dishes, week.restaurants);

  function handleClear(personId: PersonId) {
    clearOverride.mutate({ weekStart, weekday, meal, personId });
  }

  const footer = <span className="hint">Ujjval&rsquo;s salad + chass is the most common one.</span>;

  return (
    <Sheet open={open} eyebrow={eyebrow} title="Is anyone eating something else?" onClose={onClose} footer={footer}>
      <p className="tip">
        The plan is <b>{L ? L.main : "not decided yet"}</b>. Leave someone alone and they eat it — no row gets written.
      </p>
      {PEOPLE.map((p) => {
        const o = findOverride(week.overrides, weekday, meal, p.id);
        return (
          <div key={p.id} className="prow" style={{ "--pc": p.c } as CSSProperties}>
            <span className="av" style={{ "--pc": p.c } as CSSProperties}>
              {p.ini}
            </span>
            <span className="who">{p.name}</span>
            <span className="val">{o ? <b>{overrideText(o, week.dishes, week.restaurants)}</b> : "eating the plan"}</span>
            <span className="sp" />
            <button type="button" className={"mini" + (o ? " on" : "")} onClick={() => onPick(p.id)}>
              {o ? "Change" : "Pick…"}
            </button>
            {o ? (
              <button type="button" className="mini" onClick={() => handleClear(p.id)}>
                Clear
              </button>
            ) : null}
          </div>
        );
      })}
    </Sheet>
  );
}
