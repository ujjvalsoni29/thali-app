import type { ReactElement } from "react";
import type { WeekState } from "../../../shared/api";
import { REST_GROUPS, WHENS } from "../../lib/roster";
import { DragCard, DropBin, KitchenSearchField, matchesQuery } from "./shared";

/**
 * The Restaurants tab (tasks/step-09.md §09e) — bins that re-file along whichever of two
 * axes is currently selected. Ported from `Main/thali-mockup.html`'s `renderKitchen()`
 * `kTab === 'rest'` branch, including its `#raxis` segmented switcher (~lines 995-1006) —
 * plan §1a: mockup first, then the app.
 *
 * Two axes, not three, per §09e: "your groups" (`REST_GROUPS`, ported verbatim in
 * `src/lib/roster.ts`) and "when we'd go" (`WHENS`) — meal and occasion already live in one
 * `WhenKind` column (`Thali_Master.md` § Restaurant Roster), so there is no separate
 * occasion axis to invent here. Bin ids follow `rest:g:<group>` / `rest:when:<whenKind>`,
 * the exact convention `KitchenPanel.applyDrop` splits on to decide which field a drop sets
 * — it reads the axis off the TARGET bin, not off this component's `axis` prop, which is why
 * a drop always lands correctly even if the axis switches mid-drag. The `when` bins' colours
 * come straight from `WHENS[i].c` (already `var(...)`-ready, `--marigold`/`--teal`/`--blue`/
 * `--tangerine`/`--pink` per §09e's ink list) rather than a second hard-coded mapping here.
 */
export interface RestaurantsTabProps {
  week: WeekState;
  query: string;
  onQueryChange(value: string): void;
  axis: "g" | "when";
  onAxisChange(axis: "g" | "when"): void;
  onEdit(kind: "dish" | "shaak" | "rest", id: string): void;
  onNew(kind: "dish" | "shaak" | "rest"): void;
}

export function RestaurantsTab(props: RestaurantsTabProps): ReactElement {
  const { week, query, onQueryChange, axis, onAxisChange, onEdit, onNew } = props;

  const restaurants = week.restaurants.filter((r) => !r.archived && matchesQuery(r.name, query));

  return (
    <>
      <div className="tools">
        <KitchenSearchField value={query} onChange={onQueryChange} />
        <div className="segs">
          <button type="button" aria-pressed={axis === "g"} onClick={() => onAxisChange("g")}>
            Your groups
          </button>
          <button type="button" aria-pressed={axis === "when"} onClick={() => onAxisChange("when")}>
            When we'd go
          </button>
        </div>
        <span className="tip">Drag to re-file.</span>
        <button type="button" className="sticker" onClick={() => onNew("rest")}>
          + Place
        </button>
      </div>

      {axis === "g"
        ? REST_GROUPS.map((group) => {
            const binId = `rest:g:${group}`;
            const pool = restaurants.filter((r) => r.groupName === group);
            return (
              <DropBin key={binId} binId={binId} accent="var(--ink-3)" label={group} count={pool.length}>
                {pool.map((r) => (
                  <DragCard
                    key={r.id}
                    kind="rest"
                    id={r.id}
                    name={r.name}
                    fromBin={binId}
                    url={r.url}
                    onEdit={() => onEdit("rest", r.id)}
                  />
                ))}
              </DropBin>
            );
          })
        : WHENS.map((w) => {
            const binId = `rest:when:${w.id}`;
            const pool = restaurants.filter((r) => r.whenKind === w.id);
            return (
              <DropBin key={binId} binId={binId} accent={`var(${w.c})`} label={w.n} count={pool.length}>
                {pool.map((r) => (
                  <DragCard
                    key={r.id}
                    kind="rest"
                    id={r.id}
                    name={r.name}
                    fromBin={binId}
                    url={r.url}
                    onEdit={() => onEdit("rest", r.id)}
                  />
                ))}
              </DropBin>
            );
          })}
    </>
  );
}
