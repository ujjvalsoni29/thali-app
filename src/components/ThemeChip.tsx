import type { ReactElement } from "react";
import type { Theme } from "../../shared/api";

/**
 * The dinner-only "swap the theme" chip that sits above the dinner slot on a `DayCard`.
 * Ported VERBATIM from `Main/thali-mockup.html`'s `.themechip` markup/CSS (renderBoard(),
 * ~line 891) — plan §1a: mockup first, then the app. Lunch has no themes, so this never
 * renders for lunch (DayCard's job, not this component's).
 */
export interface ThemeChipProps {
  theme: Theme;
  /** no-op wiring point for now — the theme picker sheet is a later step */
  onClick(): void;
}

export function ThemeChip(props: ThemeChipProps): ReactElement {
  const { theme, onClick } = props;
  return (
    <button type="button" className="themechip" onClick={onClick}>
      {theme.icon ? <span className="ic">{theme.icon}</span> : null}
      <span className="nm">{theme.name}</span>
      <span className="sw">swap</span>
    </button>
  );
}
