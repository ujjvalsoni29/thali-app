import { Fragment, type CSSProperties, type ReactElement } from "react";
import type { Meal, Theme, WeekState } from "../../shared/api";
import { DOWS, pretty } from "../lib/weeks";
import { findItem, slotLabel } from "../lib/slot";
import { freshness } from "../lib/freshness";
import { ThemeChip } from "./ThemeChip";
import { Slot } from "./Slot";
import { EaterChips } from "./EaterChips";
import "../theme/board.css";

/**
 * One day's card on the week board: head (DOW + date + "Today" pill), then lunch and
 * dinner rows (theme chip above dinner only, the slot itself, the eater-override
 * chips). Ported VERBATIM from `Main/thali-mockup.html`'s `renderBoard()` (~lines
 * 870-917) — plan §1a: mockup first, then the app. The caller maps seven of these into
 * a `.board` grid; this component owns only the `.day` card and its children.
 */
export interface DayCardProps {
  /** 0=Mon..6=Sun */
  weekday: number;
  /** ISO, already computed by the caller via servedOn() */
  date: string;
  isToday: boolean;
  /** the resolved Theme object for this weekday, already looked up by the caller */
  theme: Theme;
  /** full week state, so this card can pull items/overrides/dishes/restaurants/lastEaten itself */
  week: WeekState;
  onOpenSlotPicker(weekday: number, meal: Meal): void;
  onClearSlot(weekday: number, meal: Meal): void;
  onOpenThemePicker(weekday: number): void;
  onOpenOverrides(weekday: number, meal: Meal): void;
}

const MEALS: readonly Meal[] = ["lunch", "dinner"];

export function DayCard(props: DayCardProps): ReactElement {
  const { weekday, date, isToday, theme, week, onOpenSlotPicker, onClearSlot, onOpenThemePicker, onOpenOverrides } =
    props;

  const accent = `var(--${theme.ink})`;
  const cardStyle = {
    "--accent": accent,
    "--accent-soft": `color-mix(in srgb, ${accent} 22%, var(--stock))`,
  } as CSSProperties;

  return (
    <article className={isToday ? "day today" : "day"} style={cardStyle}>
      <div className="dayhead">
        <span className="dow">{DOWS[weekday]}</span>
        <span className="dnum">{pretty(date)}</span>
        {isToday ? <span className="now">Today</span> : null}
      </div>
      <div className="meals">
        {MEALS.map((meal) => {
          const label = slotLabel(findItem(week.items, weekday, meal), week.dishes, week.restaurants);
          const fresh = label?.id
            ? freshness(label.kind === "rest" ? "rest" : "dish", label.id, date, week.lastEaten)
            : null;
          return (
            <Fragment key={meal}>
              <div className="mlab">{meal === "lunch" ? "Lunch" : "Dinner"}</div>
              {meal === "dinner" ? <ThemeChip theme={theme} onClick={() => onOpenThemePicker(weekday)} /> : null}
              <Slot
                label={label}
                freshness={fresh}
                onClick={() => onOpenSlotPicker(weekday, meal)}
                onClear={() => onClearSlot(weekday, meal)}
              />
              <EaterChips
                weekday={weekday}
                meal={meal}
                overrides={week.overrides}
                dishes={week.dishes}
                restaurants={week.restaurants}
                onOpenOverrides={() => onOpenOverrides(weekday, meal)}
              />
            </Fragment>
          );
        })}
      </div>
    </article>
  );
}
