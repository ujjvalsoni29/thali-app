import { useState, type ReactElement } from "react";
import type { WeekState, WhenKind } from "../../../shared/api";
import { useMoveDishTheme, useUpdateDish, useUpdateRestaurant } from "../../lib/queries";
import { KitchenDragProvider, type DragPayload } from "./shared";
import { DinnerTab } from "./DinnerTab";
import { ShaaksTab } from "./ShaaksTab";
import { RestaurantsTab } from "./RestaurantsTab";
import { ThemesTab } from "./ThemesTab";
import "../../theme/kitchen.css";

/**
 * The Kitchen — the roster manager under the board (tasks/step-09.md). Four tabs, every
 * roster rendered as drop zones, re-filing done by dragging rather than a form. Ported from
 * `Main/thali-mockup.html`'s `#kitchen` section + `renderKitchen()` (~lines 550-568,
 * 970-1022) — plan §1a: mockup first, then the app.
 *
 * **The one `applyDrop`** (§09b): every bin in every tab funnels its drop through the single
 * `applyDrop` below, so the per-roster meaning of a drop — a dinner drag moves a dish out of
 * its SOURCE theme only (the join survives everywhere else), a shaak or restaurant drop is a
 * plain field set — lives in exactly one place instead of being re-decided per tab. Bin ids
 * are the same small vocabulary the mockup used (`theme:<id>` / `theme:__none`, `dal:yes` /
 * `dal:no`, `rest:g:<group>` / `rest:when:<whenKind>`) — the axis a restaurant drop sets is
 * read off the TARGET id itself, not off whichever axis the tab happens to be showing, so
 * `applyDrop` needs no restaurant-axis state of its own.
 *
 * **No freshness badges anywhere in this tree** (§09a, Manc review 3: "The Kitchen section
 * does not need to say how long it has been") — that's why none of `DragCard`/`DropBin`
 * (shared.tsx) or any tab below ever imports `src/lib/freshness.ts`.
 *
 * The panel's open/closed state and which tab is active are local UI state, not persisted —
 * closing it and reopening later always lands back on Dinner, matching the mockup's own
 * page-load default. Search text (`query`) is lifted here rather than into each tab so it
 * survives a tab switch, the same way the mockup's single `kQ` variable did.
 *
 * Deliberate deviation from the mockup: `.kbody` is conditionally MOUNTED here when `open`,
 * rather than always rendered and hidden by the `.kitchen.open .kbody{display:none}` CSS rule
 * alone. The CSS rule still exists (kitchen.css) for the moment `open` flips, but skipping the
 * mount entirely while collapsed means a closed Kitchen does zero roster filtering / drag
 * wiring work — there is nothing here that needs to keep running while hidden.
 */
export interface KitchenPanelProps {
  week: WeekState;
  /** A card's pencil (or a Themes-tab row's own inline fields, which don't call this) was
   *  clicked — same "kind:id" shape `MealPicker`'s pencil reports. The caller (Week.tsx) opens
   *  `DishEditor` and, on save, returns here rather than to the picker. */
  onEdit(kind: "dish" | "shaak" | "rest", id: string): void;
  /** "+ Dish" / "+ Shaak" / "+ Place" was clicked. The caller opens `DishEditor` in create mode
   *  (`id: null`) for that kind. Themes has no equivalent — a new theme is created directly,
   *  in place, by `ThemesTab` itself. */
  onNew(kind: "dish" | "shaak" | "rest"): void;
  onToast(message: string): void;
}

type KitchenTab = "dinner" | "shaak" | "rest" | "themes";

const TABS: ReadonlyArray<{ id: KitchenTab; label: string }> = [
  { id: "dinner", label: "Dinner" },
  { id: "shaak", label: "Shaaks" },
  { id: "rest", label: "Restaurants" },
  { id: "themes", label: "Themes" },
];

export function KitchenPanel(props: KitchenPanelProps): ReactElement {
  const { week, onEdit, onNew, onToast } = props;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<KitchenTab>("dinner");
  const [query, setQuery] = useState("");
  const [restAxis, setRestAxis] = useState<"g" | "when">("g");

  const moveDishTheme = useMoveDishTheme();
  const updateDish = useUpdateDish();
  const updateRestaurant = useUpdateRestaurant();

  function applyDrop(payload: DragPayload, target: string, from: string) {
    if (target === from) return; // dropped back where it started — nothing changed

    if (payload.kind === "dish") {
      // A dinner dish can live in several themes at once, so this is a move out of the
      // source theme and into the target, never a wholesale replace (tasks/step-09.md §09c:
      // "Drag moves out of the source only").
      const toThemeId = target === "theme:__none" ? undefined : target.slice("theme:".length);
      const fromThemeId = from === "theme:__none" ? undefined : from.slice("theme:".length);
      moveDishTheme.mutate(
        { dishId: payload.id, fromThemeId, toThemeId },
        { onError: () => onToast("Could not move that dish — try again.") },
      );
    } else if (payload.kind === "shaak") {
      // Single-valued: the drop simply sets needs_dal.
      updateDish.mutate(
        { id: payload.id, needsDal: target === "dal:yes" },
        { onError: () => onToast("Could not update that shaak — try again.") },
      );
    } else {
      // Restaurant: single-valued on whichever axis the TARGET bin names.
      const [, axis, value] = target.split(":");
      if (axis === "g") {
        updateRestaurant.mutate(
          { id: payload.id, groupName: value },
          { onError: () => onToast("Could not move that restaurant — try again.") },
        );
      } else {
        updateRestaurant.mutate(
          { id: payload.id, whenKind: value as WhenKind },
          { onError: () => onToast("Could not move that restaurant — try again.") },
        );
      }
    }
  }

  const dinners = week.dishes.filter((d) => d.kind === "dinner" && !d.archived).length;
  const shaaks = week.dishes.filter((d) => d.kind === "shaak" && !d.archived).length;
  const places = week.restaurants.filter((r) => !r.archived).length;
  const themesCount = week.themeRoster.filter((t) => !t.archived).length;

  return (
    <section className={"kitchen" + (open ? " open" : "")}>
      <div className="khead">
        <h2>The Kitchen</h2>
        <span className="guj">રસોડું</span>
        <span className="tip">
          {dinners} dinners · {shaaks} shaaks · {places} places · {themesCount} themes
        </span>
        <div className="sp" />
        <div className="segs">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" className="sticker" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "Open"}
        </button>
      </div>

      {open ? (
        <div className="kbody">
          <KitchenDragProvider onDrop={applyDrop}>
            {tab === "dinner" ? (
              <DinnerTab week={week} query={query} onQueryChange={setQuery} onEdit={onEdit} onNew={onNew} />
            ) : tab === "shaak" ? (
              <ShaaksTab week={week} query={query} onQueryChange={setQuery} onEdit={onEdit} onNew={onNew} />
            ) : tab === "rest" ? (
              <RestaurantsTab
                week={week}
                query={query}
                onQueryChange={setQuery}
                axis={restAxis}
                onAxisChange={setRestAxis}
                onEdit={onEdit}
                onNew={onNew}
              />
            ) : (
              <ThemesTab week={week} onToast={onToast} />
            )}
          </KitchenDragProvider>
        </div>
      ) : null}
    </section>
  );
}
