import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import type { WeekState, WhenKind } from "../../shared/api";
import { REST_GROUPS, WHENS } from "../lib/roster";
import { normUrl } from "../lib/url";
import {
  useArchiveDish,
  useArchiveRestaurant,
  useCreateDish,
  useCreateRestaurant,
  useUpdateDish,
  useUpdateRestaurant,
} from "../lib/queries";
import { RowLabel, Sheet } from "./Sheet";

/**
 * One editor for three different roster rows — a dinner dish, a lunch shaak, or a
 * restaurant — reached from the pencil on any of their rows. Ported VERBATIM from
 * `Main/thali-mockup.html`'s `openDishEditor()`/`saveDishEditor()` (~lines 1680-1736)
 * plus the `data-rg`/`data-rw`/`data-sd` single-select chip-group handler (~lines
 * 1738-1744) and the `data-archive` branch of the main click handler (~lines 1645-1663)
 * — plan §1a: mockup first, then the app.
 *
 * Deliberate deviations from the mockup's imperative version:
 * - The mockup toggled a clicked chip's `aria-pressed` and read `[aria-pressed="true"]`
 *   back out of the DOM at save time via one shared `document` click listener for every
 *   `data-rg`/`data-rw`/`data-sd` group on the page. Here each single-select group (Group,
 *   When we'd go, Pairing) is a small piece of local component state instead — the same
 *   `aria-pressed` attribute is still what renders, it is just derived from state rather
 *   than being the state.
 */
export interface DishEditorProps {
  open: boolean;
  /** "dish" = a dinner dish (Dish row, kind:"dinner"), "shaak" = a lunch shaak (Dish row,
   *  kind:"shaak"), "rest" = a restaurant (Restaurant, not Dish). */
  kind: "dish" | "shaak" | "rest";
  /** null = creating a brand new one ("Add something" title, no Archive button). */
  id: string | null;
  week: WeekState;
  /** X button / scrim click / Escape — closes the whole sheet stack back to the board.
   *  Deliberately NOT the same as onDone: canceling out of an edit should not land you
   *  back in the picker you came from. */
  onClose(): void;
  /** Save or Archive succeeded. The caller decides what "go back" means. */
  onDone(): void;
}

export function DishEditor(props: DishEditorProps): ReactElement {
  const { open, kind, id, week, onClose, onDone } = props;

  const dish = kind !== "rest" && id !== null ? (week.dishes.find((d) => d.id === id) ?? null) : null;
  const rest = kind === "rest" && id !== null ? (week.restaurants.find((r) => r.id === id) ?? null) : null;

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [themeIds, setThemeIds] = useState<ReadonlySet<string>>(new Set());
  const [group, setGroup] = useState<string>(REST_GROUPS[0]);
  const [when, setWhen] = useState<WhenKind>("dinner");
  const [needsDal, setNeedsDal] = useState(true);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset every field from the current roster row each time the sheet opens (or the row
  // it's pointed at changes while open) — matching the mockup's own openDishEditor(), which
  // rebuilds this whole sheet's markup from `o` on every open rather than carrying stale
  // state forward.
  useEffect(() => {
    if (!open) return;
    if (kind === "rest") {
      setName(rest?.name ?? "");
      setUrl(rest?.url ?? "");
      setGroup(rest?.groupName ?? REST_GROUPS[0]);
      setWhen(rest?.whenKind ?? "dinner");
    } else if (kind === "shaak") {
      setName(dish?.name ?? "");
      setNeedsDal(dish?.needsDal ?? true);
    } else {
      setName(dish?.name ?? "");
      setUrl(dish?.recipeUrl ?? "");
      setThemeIds(new Set(dish?.themeIds ?? []));
    }
    // `dish`/`rest` are deliberately not deps: they're re-derived from `week` every render,
    // and re-syncing mid-edit whenever an unrelated week query refetches would clobber
    // whatever the person is mid-typing. Reset only fires on open (or pointing at a
    // different row), matching openDishEditor()'s own "rebuild from `o` on open" behavior.
  }, [open, id, kind]);

  const createDish = useCreateDish();
  const updateDish = useUpdateDish();
  const archiveDish = useArchiveDish();
  const createRestaurant = useCreateRestaurant();
  const updateRestaurant = useUpdateRestaurant();
  const archiveRestaurant = useArchiveRestaurant();

  function toggleTheme(themeId: string) {
    setThemeIds((prev) => {
      const next = new Set(prev);
      if (next.has(themeId)) next.delete(themeId);
      else next.add(themeId);
      return next;
    });
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      nameRef.current?.focus();
      return;
    }
    if (kind === "dish") {
      if (id === null) {
        createDish.mutate({ name: trimmed, kind: "dinner", themeIds: [...themeIds] }, { onSuccess: onDone });
      } else {
        updateDish.mutate(
          { id, name: trimmed, recipeUrl: normUrl(url), themeIds: [...themeIds] },
          { onSuccess: onDone },
        );
      }
    } else if (kind === "shaak") {
      if (id === null) {
        createDish.mutate({ name: trimmed, kind: "shaak", needsDal }, { onSuccess: onDone });
      } else {
        updateDish.mutate({ id, name: trimmed, needsDal }, { onSuccess: onDone });
      }
    } else {
      if (id === null) {
        createRestaurant.mutate(
          { name: trimmed, groupName: group, whenKind: when, url: normUrl(url) },
          { onSuccess: onDone },
        );
      } else {
        updateRestaurant.mutate(
          { id, name: trimmed, groupName: group, whenKind: when, url: normUrl(url) },
          { onSuccess: onDone },
        );
      }
    }
  }

  function handleArchive() {
    if (id === null) return;
    if (kind === "rest") archiveRestaurant.mutate({ id }, { onSuccess: onDone });
    else archiveDish.mutate({ id }, { onSuccess: onDone });
  }

  const eyebrow = kind === "rest" ? "Restaurant" : kind === "shaak" ? "Shaak" : "Dinner dish";
  const title = id === null ? "Add something" : kind === "rest" ? (rest?.name ?? "") : (dish?.name ?? "");

  return (
    <Sheet
      open={open}
      eyebrow={eyebrow}
      title={title}
      onClose={onClose}
      footer={
        <>
          {id !== null ? (
            <button type="button" className="sticker" onClick={handleArchive}>
              Archive
            </button>
          ) : null}
          <span className="hint">Archiving hides it and keeps every past week intact.</span>
          <span className="sp" />
          <button type="button" className="sticker hot" onClick={handleSave}>
            Save
          </button>
        </>
      }
    >
      <RowLabel label="Name" />
      <label className="field">
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          data-autofocus
        />
      </label>

      {kind === "dish" ? (
        <>
          <RowLabel label="Themes" right="a dish can belong to several" />
          <div className="chips">
            {week.themeRoster
              .filter((t) => t.kind !== "rest")
              .map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className="chip ink"
                  style={{ "--c": `var(--${t.ink})` } as CSSProperties}
                  aria-pressed={themeIds.has(t.id)}
                  onClick={() => toggleTheme(t.id)}
                >
                  {t.icon ? `${t.icon} ` : ""}
                  {t.name}
                </button>
              ))}
          </div>
        </>
      ) : null}

      {kind === "rest" ? (
        <>
          <RowLabel label="Group" />
          <div className="chips">
            {REST_GROUPS.map((g) => (
              <button
                type="button"
                key={g}
                className="chip"
                aria-pressed={group === g}
                onClick={() => setGroup(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <RowLabel label="When we'd go" right="occasion and meal are one field" />
          <div className="chips">
            {WHENS.map((w) => (
              <button
                type="button"
                key={w.id}
                className="chip ink"
                style={{ "--c": `var(${w.c})` } as CSSProperties}
                aria-pressed={when === w.id}
                onClick={() => setWhen(w.id)}
              >
                {w.n}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {kind === "shaak" ? (
        <>
          <RowLabel label="Pairing" right="or just drag it between the bins" />
          <div className="chips">
            <button type="button" className="chip" aria-pressed={needsDal} onClick={() => setNeedsDal(true)}>
              Wants a dal
            </button>
            <button type="button" className="chip" aria-pressed={!needsDal} onClick={() => setNeedsDal(false)}>
              Stands alone
            </button>
          </div>
        </>
      ) : null}

      {kind !== "shaak" ? (
        <>
          <RowLabel label="Recipe / menu link" right="no https:// needed" />
          <label className="field">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="vikschaat.com" />
          </label>
        </>
      ) : null}
    </Sheet>
  );
}
