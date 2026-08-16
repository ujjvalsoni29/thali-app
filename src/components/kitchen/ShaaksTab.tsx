import type { ReactElement } from "react";
import type { WeekState } from "../../../shared/api";
import { DragCard, DropBin, KitchenSearchField, matchesQuery } from "./shared";

/**
 * The Shaaks tab (tasks/step-09.md §09d) — just two bins, wants-a-dal vs. stands-alone.
 * Ported from `Main/thali-mockup.html`'s `renderKitchen()` `kTab === 'shaak'` branch
 * (~lines 988-994) — plan §1a: mockup first, then the app.
 *
 * §09d calls this "the most important two bins in the app": `needsDal` is the one column
 * in `Thali_Master.md` that was inferred rather than transcribed, not transcribed from the
 * source, so the hint below says so outright rather than leaving it implicit — dragging a
 * card between the two bins is how Manc corrects a bad guess without anyone touching code.
 * A drop here is a single-field `applyDrop` branch (`KitchenPanel.tsx`): it sets `needsDal`
 * to whichever bin the card landed in, nothing else about the shaak changes.
 *
 * Shaaks don't carry a recipe link worth showing in this tab (the mockup's plain shaak
 * roster has no `url` field here), so `DragCard`'s optional `url` prop is simply omitted.
 */
export interface ShaaksTabProps {
  week: WeekState;
  query: string;
  onQueryChange(value: string): void;
  onEdit(kind: "dish" | "shaak" | "rest", id: string): void;
  onNew(kind: "dish" | "shaak" | "rest"): void;
}

export function ShaaksTab(props: ShaaksTabProps): ReactElement {
  const { week, query, onQueryChange, onEdit, onNew } = props;

  const shaaks = week.dishes.filter((d) => d.kind === "shaak" && !d.archived && matchesQuery(d.name, query));
  const wantsDal = shaaks.filter((d) => d.needsDal);
  const standsAlone = shaaks.filter((d) => !d.needsDal);

  return (
    <>
      <div className="tools">
        <KitchenSearchField value={query} onChange={onQueryChange} />
        <span className="tip">
          Drag between the two bins to fix the dal pairing — this is the one column I guessed.
        </span>
        <button type="button" className="sticker" onClick={() => onNew("shaak")}>
          + Shaak
        </button>
      </div>

      <DropBin binId="dal:yes" accent="var(--marigold)" label="Wants a dal alongside" count={wantsDal.length}>
        {wantsDal.map((dish) => (
          <DragCard
            key={dish.id}
            kind="shaak"
            id={dish.id}
            name={dish.name}
            fromBin="dal:yes"
            onEdit={() => onEdit("shaak", dish.id)}
          />
        ))}
      </DropBin>
      <DropBin binId="dal:no" accent="var(--leaf)" label="Stands alone" count={standsAlone.length}>
        {standsAlone.map((dish) => (
          <DragCard
            key={dish.id}
            kind="shaak"
            id={dish.id}
            name={dish.name}
            fromBin="dal:no"
            onEdit={() => onEdit("shaak", dish.id)}
          />
        ))}
      </DropBin>
    </>
  );
}
