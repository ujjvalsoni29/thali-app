import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import type { ThemeInk, WeekState } from "../../shared/api";
import { INKS } from "../lib/roster";
import { useDeleteTheme, useUpdateTheme } from "../lib/queries";
import { RowLabel, Sheet } from "./Sheet";

/**
 * Edit one dinner theme in place, reached from the pencil on a `ThemePicker` row. Ported
 * VERBATIM from `Main/thali-mockup.html`'s `openThemeEditor()`/`saveThemeEditor()` (~lines
 * 1120-1155) — plan §1a: mockup first, then the app. There is no "new theme" mode here
 * (that's step 09's Kitchen work) — `id` always names an existing roster row.
 *
 * Deliberate deviations from the mockup's imperative version:
 * - The ink row's single-select was the mockup's shared `data-tink` DOM click handler
 *   (read back via `[aria-pressed="true"]` at save time); here it is local component state,
 *   same as `DishEditor`'s single-select groups.
 * - The mockup's `data-tdel` handler hid the Remove button entirely once `S.themes.length
 *   <= 2` and no-opped the click below that floor. This step's spec has the worker enforce
 *   that same floor (rejecting with `BAD_INPUT`) and has this component always render the
 *   button, silently leaving the sheet open if the worker declines — there is no toast
 *   plumbing reachable from here to explain why.
 */
export interface ThemeEditorProps {
  open: boolean;
  /** Always an existing theme id. */
  id: string;
  week: WeekState;
  onClose(): void;
  onDone(): void;
}

export function ThemeEditor(props: ThemeEditorProps): ReactElement {
  const { open, id, week, onClose, onDone } = props;

  const theme = week.themeRoster.find((t) => t.id === id) ?? null;

  const [icon, setIcon] = useState("");
  const [name, setName] = useState("");
  const [sub, setSub] = useState("");
  const [ink, setInk] = useState<ThemeInk>("marigold");
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset every field from the current theme each time the sheet opens (or is pointed at a
  // different theme while open) — matching openThemeEditor()'s own "rebuild from `t` on
  // open" behavior.
  useEffect(() => {
    if (!open || !theme) return;
    setIcon(theme.icon ?? "");
    setName(theme.name);
    setSub(theme.sub ?? "");
    setInk(theme.ink);
    // `theme` is deliberately not a dep — see DishEditor.tsx's identical note.
  }, [open, id]);

  const updateTheme = useUpdateTheme();
  const deleteTheme = useDeleteTheme();

  const dishCount = theme && theme.kind !== "rest" ? week.dishes.filter((d) => d.themeIds.includes(id)).length : 0;

  function handleSave() {
    if (!theme) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      nameRef.current?.focus();
      return;
    }
    const trimmedIcon = icon.trim();
    updateTheme.mutate(
      {
        id,
        name: trimmedName,
        sub: sub.trim(),
        icon: trimmedIcon || theme.icon || undefined,
        ink,
      },
      { onSuccess: onDone },
    );
  }

  function handleRemove() {
    deleteTheme.mutate(
      { id },
      {
        onSuccess: onDone,
        onError: () => {
          // The worker rejects removal below 3 remaining themes with a BAD_INPUT error.
          // There's no toast plumbing reachable from here, so just leave the sheet open.
        },
      },
    );
  }

  return (
    <Sheet
      open={open}
      eyebrow="Dinner theme"
      title={theme?.name ?? ""}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sticker" onClick={handleRemove}>
            Remove theme
          </button>
          <span className="sp" />
          <button type="button" className="sticker hot" onClick={handleSave}>
            Save
          </button>
        </>
      }
    >
      <RowLabel label="Icon and name" />
      <div className="newrow">
        <label className="field">
          <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Icon" />
        </label>
        <label className="field">
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Theme name"
            data-autofocus
          />
        </label>
      </div>

      <RowLabel label="What kind of night is it?" />
      <label className="field">
        <input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="one short line" />
      </label>

      <RowLabel label="Ink" />
      <div className="chips">
        {INKS.map((c) => {
          const bare = c.replace("--", "");
          return (
            <button
              type="button"
              key={c}
              className="chip ink"
              style={{ "--c": `var(${c})` } as CSSProperties}
              aria-pressed={bare === ink}
              onClick={() => setInk(bare as ThemeInk)}
            >
              {bare}
            </button>
          );
        })}
      </div>

      {theme && theme.kind !== "rest" ? (
        <>
          <RowLabel label="Dishes in this theme" right={`${dishCount} right now`} />
          <p className="tip">
            Move dishes in and out by dragging them in The Kitchen → Dinner, or from any dish&rsquo;s own pencil.
          </p>
        </>
      ) : null}
    </Sheet>
  );
}
