import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type ReactElement,
} from "react";
import type { Theme, ThemeInk, WeekState } from "../../../shared/api";
import { INKS } from "../../lib/roster";
import { useCreateTheme, useDeleteTheme, useUpdateTheme } from "../../lib/queries";

/**
 * The Themes tab (tasks/step-09.md §09f) — the one Kitchen tab that is NOT draggable. Ported
 * from `Main/thali-mockup.html`'s `renderKitchen()` `else` branch (~lines 1010-1024), the
 * `data-newtheme` handler (~lines 1664-1668), the `data-tcolor`/`data-tdel` handlers (~lines
 * 1651-1663) and the `data-tfield` input handler (~lines 1746-1752) — plan §1a: mockup first,
 * then the app.
 *
 * Deliberate deviation from the mockup: the mockup saved icon/name/sub on every keystroke
 * (`document.addEventListener('input', ...)` calling `save()` immediately), which is fine
 * against its in-memory `S` object but wasteful as one network call per keystroke against the
 * real worker. Each row here debounces those three text fields (~500ms idle) before calling
 * `useUpdateTheme`, same idea as `useToast.ts`'s single dismiss timer, cleaned up the same way.
 * The ink swatch click and Remove are still immediate, discrete clicks — no debounce, matching
 * the mockup's `data-tcolor`/`data-tdel` handlers exactly.
 *
 * Remove floor: the mockup hid/no-opped `data-tdel` once `S.themes.length <= 2`. This app's
 * worker (`worker/routes/theme.ts`) enforces "at least 3 themes must remain" instead (step
 * 04f), so the Remove button here is disabled — with a `title` explaining why — once
 * `week.themeRoster.length <= 3`, and `useDeleteTheme`'s `onError` also calls `props.onToast`
 * as a belt-and-suspenders fallback for any race between the disabled state and the request.
 */
export interface ThemesTabProps {
  week: WeekState;
  onToast(message: string): void;
}

export function ThemesTab(props: ThemesTabProps): ReactElement {
  const { week, onToast } = props;

  const createTheme = useCreateTheme();

  function handleNewTheme() {
    const ink = INKS[week.themeRoster.length % INKS.length].replace("--", "") as ThemeInk;
    createTheme.mutate({ name: "New theme", sub: "say what it is", icon: "\u{1F374}", ink });
  }

  return (
    <>
      <div className="tools">
        <span className="tip">
          Rename, re-ink, change the icon. One theme per weekday — add as many as you like and swap them in from a
          day card.
        </span>
        <button type="button" className="sticker" onClick={handleNewTheme}>
          + Theme
        </button>
      </div>

      {week.themeRoster.map((theme) => (
        <ThemeRow key={theme.id} theme={theme} week={week} canRemove={week.themeRoster.length > 3} onToast={onToast} />
      ))}
    </>
  );
}

interface ThemeRowProps {
  theme: Theme;
  week: WeekState;
  canRemove: boolean;
  onToast(message: string): void;
}

const DEBOUNCE_MS = 500;

function ThemeRow(props: ThemeRowProps): ReactElement {
  const { theme, week, canRemove, onToast } = props;

  const [icon, setIcon] = useState(theme.icon ?? "");
  const [name, setName] = useState(theme.name);
  const [sub, setSub] = useState(theme.sub ?? "");

  const updateTheme = useUpdateTheme();
  const deleteTheme = useDeleteTheme();

  const iconTimer = useRef<number | null>(null);
  const nameTimer = useRef<number | null>(null);
  const subTimer = useRef<number | null>(null);

  // Reset every field from the current theme whenever the row it's pointed at changes (or the
  // roster order shifts under it) — matching `ThemeEditor.tsx`/`DishEditor.tsx`'s own "rebuild
  // from the roster row on open" reasoning. `theme` is deliberately not a dep beyond `theme.id`:
  // it is re-derived from `week` every render, and re-syncing mid-edit whenever an unrelated
  // week refetch lands would clobber whatever is being typed.
  useEffect(() => {
    setIcon(theme.icon ?? "");
    setName(theme.name);
    setSub(theme.sub ?? "");
  }, [theme.id]);

  useEffect(() => {
    return () => {
      if (iconTimer.current !== null) window.clearTimeout(iconTimer.current);
      if (nameTimer.current !== null) window.clearTimeout(nameTimer.current);
      if (subTimer.current !== null) window.clearTimeout(subTimer.current);
    };
  }, []);

  function scheduleSave(timerRef: MutableRefObject<number | null>, save: () => void) {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      save();
    }, DEBOUNCE_MS);
  }

  function handleIconChange(value: string) {
    setIcon(value);
    scheduleSave(iconTimer, () => updateTheme.mutate({ id: theme.id, icon: value.trim() }));
  }
  function handleNameChange(value: string) {
    setName(value);
    scheduleSave(nameTimer, () => {
      const trimmed = value.trim();
      if (!trimmed) return;
      updateTheme.mutate({ id: theme.id, name: trimmed });
    });
  }
  function handleSubChange(value: string) {
    setSub(value);
    scheduleSave(subTimer, () => updateTheme.mutate({ id: theme.id, sub: value.trim() }));
  }

  function handleInkClick(bare: string) {
    updateTheme.mutate({ id: theme.id, ink: bare as ThemeInk });
  }

  function handleRemove() {
    if (!canRemove) return;
    deleteTheme.mutate(
      { id: theme.id },
      { onError: () => onToast("At least 3 themes must remain — try removing a different one.") },
    );
  }

  const used =
    theme.kind === "rest"
      ? `${week.restaurants.filter((r) => !r.archived).length} places`
      : `${week.dishes.filter((d) => !d.archived && d.themeIds.includes(theme.id)).length} dishes`;

  return (
    <div className="trow" style={{ "--accent": `var(--${theme.ink})` } as CSSProperties}>
      <input className="tic" value={icon} onChange={(e) => handleIconChange(e.target.value)} />
      <input className="tname" value={name} onChange={(e) => handleNameChange(e.target.value)} />
      <input className="tsub" value={sub} onChange={(e) => handleSubChange(e.target.value)} />
      <span className="inks">
        {INKS.map((c) => {
          const bare = c.replace("--", "");
          return (
            <button
              type="button"
              key={c}
              className="inkbtn"
              style={{ background: `var(${c})` }}
              aria-pressed={theme.ink === bare}
              onClick={() => handleInkClick(bare)}
            />
          );
        })}
      </span>
      <span className="n">{used}</span>
      <button
        type="button"
        className="mini"
        disabled={!canRemove}
        title={canRemove ? undefined : "At least 3 themes must remain"}
        onClick={handleRemove}
      >
        Remove
      </button>
    </div>
  );
}
