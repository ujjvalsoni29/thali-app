import type { ReactElement } from "react";
import type { Theme, WeekState } from "../../shared/api";
import { Sheet } from "./Sheet";
import { DOWS, pretty, servedOn } from "../lib/weeks";
import { useSetWeekdayTheme } from "../lib/queries";

/**
 * The "what kind of night is it" sheet — swaps a weekday's dinner theme. Ported from
 * `Main/thali-mockup.html`'s `openThemePicker()` (~lines 1101-1115) and the `data-pick-theme`/
 * `data-edittheme` branches of the global click handler (~lines 1572-1579) — plan §1a: mockup
 * first, then the app.
 *
 * Every `week.themeRoster` entry is a valid pick, including a `kind: "rest"` theme — picking
 * one of those is exactly what turns a day into a restaurant night, so nothing here filters
 * the roster the way `MealPicker`'s own lists get filtered.
 */
export interface ThemePickerProps {
  open: boolean;
  weekday: number;
  weekStart: string;
  week: WeekState;
  onClose(): void;
  onEditTheme(id: string): void;
}

const PENCIL_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.5 4.5l3 3" />
    <path d="M5 19l1-4L17 4l3 3L9 18z" />
  </svg>
);

export function ThemePicker(props: ThemePickerProps): ReactElement {
  const { open, weekday, weekStart, week, onClose, onEditTheme } = props;
  const setWeekdayTheme = useSetWeekdayTheme();

  const date = servedOn(weekStart, weekday);
  const eyebrow = `${DOWS[weekday]} · ${pretty(date)} · dinner`;

  function selectTheme(theme: Theme) {
    setWeekdayTheme.mutate({ weekStart, weekday, themeId: theme.id }, { onSuccess: onClose });
  }

  return (
    <Sheet open={open} eyebrow={eyebrow} title="What kind of night is it?" onClose={onClose}>
      <div className="picks">
        {week.themeRoster.map((theme) => {
          const count = week.dishes.filter((d) => d.themeIds.includes(theme.id)).length;
          const badge = theme.kind === "rest" ? "restaurants" : theme.id === "firsttime" ? "recipe links" : `${count} dishes`;
          const isSel = week.themes[weekday] === theme.id;

          function select() {
            selectTheme(theme);
          }

          return (
            <div
              key={theme.id}
              role="button"
              tabIndex={0}
              className={"pick" + (isSel ? " sel" : "")}
              onClick={select}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  select();
                }
              }}
            >
              {theme.icon ? <span className="themeic">{theme.icon}</span> : null}
              <span className="col">
                <span className="nm">{theme.name}</span>
                <span className="cu">{theme.sub}</span>
              </span>
              <span className="rt">
                <span className="fresh" style={{ background: `var(--${theme.ink})`, color: "var(--on-ink)" }}>
                  {badge}
                </span>
                {/* Same stopPropagation discipline as MealPicker's pick rows, and for the same
                    reason: this row is a div with role="button" (not a real <button> — it
                    contains this button, and a button inside a button is invalid HTML the
                    browser silently un-nests). This button's own onClick calls
                    e.stopPropagation() before calling onEditTheme, which is what stops a
                    click on the pencil from also bubbling up and selecting this theme via the
                    row's own onClick. Do not remove it or reorder this markup assuming it's
                    redundant. */}
                <button
                  type="button"
                  className="mini round"
                  title={`Edit ${theme.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTheme(theme.id);
                  }}
                >
                  {PENCIL_ICON}
                </button>
              </span>
            </div>
          );
        })}
      </div>
      <p className="tip">A theme narrows the picker; it never locks anything out.</p>
    </Sheet>
  );
}
