import type { CSSProperties, ReactElement } from "react";
import type { Dish, PlanOverride, Restaurant } from "../../shared/api";
import { findOverride, overrideText } from "../lib/slot";
import { PEOPLE } from "../lib/roster";

/**
 * The row of per-person override chips beneath a slot, plus the trailing "+ someone
 * else" affordance. Ported VERBATIM from `Main/thali-mockup.html`'s `.eaters`/`.eater`/
 * `.av`/`.addeat` markup/CSS (renderBoard(), ~lines 908-912) — plan §1a: mockup first,
 * then the app. Absent = eating the plan, so a person with no override renders no chip
 * at all — the common case.
 */
export interface EaterChipsProps {
  weekday: number;
  meal: "lunch" | "dinner";
  /** the WHOLE week's overrides array — filtered to this weekday+meal via findOverride per person */
  overrides: readonly PlanOverride[];
  dishes: readonly Dish[];
  restaurants: readonly Restaurant[];
  /** no-op wiring point for now — both an existing chip and "+ someone else" call this */
  onOpenOverrides(): void;
}

export function EaterChips(props: EaterChipsProps): ReactElement {
  const { weekday, meal, overrides, dishes, restaurants, onOpenOverrides } = props;

  return (
    <div className="eaters">
      {PEOPLE.map((p) => {
        const o = findOverride(overrides, weekday, meal, p.id);
        if (!o) return null;
        return (
          <button type="button" key={p.id} className="eater" onClick={onOpenOverrides}>
            <span className="av" style={{ "--pc": p.c } as CSSProperties}>
              {p.ini}
            </span>
            <span className="t">{overrideText(o, dishes, restaurants)}</span>
          </button>
        );
      })}
      <button type="button" className="addeat" onClick={onOpenOverrides}>
        + someone else
      </button>
    </div>
  );
}
