import type { ReactElement } from "react";
import type { WeekState } from "../../../shared/api";
import { DragCard, DropBin, KitchenSearchField, matchesQuery } from "./shared";

/**
 * The Dinner tab (tasks/step-09.md §09c) — one bin per non-rest theme, in the roster's
 * existing `sort` order (server-sorted already — this component never re-sorts), plus a final
 * Unassigned bin. Ported from `Main/thali-mockup.html`'s `renderKitchen()` `kTab === 'dinner'`
 * branch (~lines 977-984) — plan §1a: mockup first, then the app.
 *
 * **A dish belongs to several themes at once and shows up in every one of them.** That is the
 * `dish_themes` join table rendered honestly, not a bug to dedupe away (§09c: "that is not
 * duplication, it is the join table rendered honestly"). Dragging a card only moves it out of
 * the bin it was picked up from — `KitchenPanel`'s `applyDrop` is what turns that into a
 * `moveDishTheme` call using both `from` and `to`; this component just reports the drop, same
 * as every other tab built on `shared.tsx`'s primitives.
 *
 * Multi-theme assignment beyond a single drag, renaming and recipe links all live behind the
 * pencil (`onEdit`, which opens `DishEditor` — step 07f), not here. And, per §09a's own rule
 * for the whole Kitchen tree, no freshness badges: this is the roster, not the picker.
 */
export interface DinnerTabProps {
  week: WeekState;
  query: string;
  onQueryChange(value: string): void;
  /** A dish's pencil was clicked. */
  onEdit(kind: "dish" | "shaak" | "rest", id: string): void;
  /** The "+ Dish" sticker was clicked. */
  onNew(kind: "dish" | "shaak" | "rest"): void;
}

export function DinnerTab(props: DinnerTabProps): ReactElement {
  const { week, query, onQueryChange, onEdit, onNew } = props;

  const dinnerThemes = week.themeRoster.filter((t) => t.kind !== "rest");
  const dinnerThemeIds = new Set(dinnerThemes.map((t) => t.id));

  const unassignedPool = week.dishes.filter(
    (d) =>
      d.kind === "dinner" &&
      !d.archived &&
      !d.themeIds.some((id) => dinnerThemeIds.has(id)) &&
      matchesQuery(d.name, query),
  );

  return (
    <>
      <div className="tools">
        <KitchenSearchField value={query} onChange={onQueryChange} />
        <span className="tip">
          Drag a dish onto another theme to move it. Edit for multi-theme, links and renaming.
        </span>
        <button type="button" className="sticker" onClick={() => onNew("dish")}>
          + Dish
        </button>
      </div>

      {dinnerThemes.map((theme) => {
        const binId = `theme:${theme.id}`;
        const pool = week.dishes.filter(
          (d) => d.kind === "dinner" && !d.archived && d.themeIds.includes(theme.id) && matchesQuery(d.name, query),
        );
        return (
          <DropBin
            key={theme.id}
            binId={binId}
            accent={`var(--${theme.ink})`}
            label={theme.icon ? `${theme.icon} ${theme.name}` : theme.name}
            count={pool.length}
          >
            {pool.map((dish) => (
              <DragCard
                key={dish.id}
                kind="dish"
                id={dish.id}
                name={dish.name}
                fromBin={binId}
                url={dish.recipeUrl}
                onEdit={() => onEdit("dish", dish.id)}
              />
            ))}
          </DropBin>
        );
      })}

      <DropBin binId="theme:__none" accent="var(--ink-3)" label="Unassigned" count={unassignedPool.length}>
        {unassignedPool.map((dish) => (
          <DragCard
            key={dish.id}
            kind="dish"
            id={dish.id}
            name={dish.name}
            fromBin="theme:__none"
            url={dish.recipeUrl}
            onEdit={() => onEdit("dish", dish.id)}
          />
        ))}
      </DropBin>
    </>
  );
}
