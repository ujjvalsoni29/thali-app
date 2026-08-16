import { useEffect, useRef, useState, Fragment, type CSSProperties, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import type { Dish, LunchFormat, Meal, PersonId, Restaurant, WeekState, WhenKind } from "../../shared/api";
import { Sheet, RowLabel } from "./Sheet";
import { DOWS, pretty, servedOn } from "../lib/weeks";
import { findItem, findOverride, slotLabel } from "../lib/slot";
import { freshness } from "../lib/freshness";
import { LUNCH_FORMATS, PEOPLE, REST_GROUPS, WHENS } from "../lib/roster";
import { normUrl } from "../lib/url";
import { useCreateDish, useCreateRestaurant, useSetOverride, useSetSlot } from "../lib/queries";

/**
 * The picker sheet — the one popup that fills a lunch or dinner slot. Ported from
 * `Main/thali-mockup.html`'s `openPicker()`/`drawPicker()` (~lines 1157-1236), `pickList()`
 * (~lines 1242-1253), and the `data-fmt`/`data-rwhen`/`showall`/`data-pick`/`data-add`/
 * `data-savefmt`/`data-editdish` branches of the global click handler (~lines 1593-1630) —
 * plan §1a: mockup first, then the app.
 *
 * Step 08 (per-person overrides) added the free-text one-off field and "Eat the plan" clear
 * button (mockup's `data-freeov`/`data-clearov`), and wired the `forPerson` branch's saves to
 * call `onReturnToRoster()` instead of `onClose()` — matching the mockup's `openOverrides()`
 * re-open of the roster sheet after a person-mode save/clear, rather than closing the whole
 * picker flow the way the plan-wide branch does.
 *
 * This component is mounted once, persistently (like `Toast.tsx`), and toggles `Sheet`'s
 * `open` prop — it is NOT remounted per slot via a changing `key`. That is deliberate: `Sheet`
 * only plays its "arrival rotation" CSS transition when `open` flips false→true on an
 * *already-mounted* node (the same reason `Toast.tsx` stays mounted with `message` toggling
 * rather than being conditionally rendered); a remount would start the sheet already in its
 * `.on` state with no transition to animate. So `q`/`showAll`/`fmt`/`rWhen`/the add-a-thing
 * fields are reset by an explicit effect keyed on `open`/`weekday`/`meal`/`forPerson` (see
 * below) rather than by a fresh mount — the same pattern `DishEditor.tsx`/`ThemeEditor.tsx`
 * use for their own field resets.
 */
export interface MealPickerProps {
  open: boolean;
  weekday: number; // 0=Mon..6=Sun
  meal: Meal; // "lunch" | "dinner"
  /** null in every call this step ever makes — the prop exists now so step 08's per-person
   *  overrides is a prop, not a rewrite. Still implement the branch correctly: when set, this
   *  picker edits ONE person's plan_overrides row instead of the shared plan_items row. */
  forPerson: PersonId | null;
  weekStart: string;
  week: WeekState;
  onClose(): void;
  /** Called instead of onClose() when a person-mode (forPerson set) save/clear succeeds —
   *  the mockup's openOverrides() re-open. Never called when forPerson is null; the
   *  plan-wide path still calls onClose() same as before. The caller (Week.tsx) re-shows
   *  the roster sheet for the same weekday/meal. */
  onReturnToRoster(): void;
  /** A pencil on any row was clicked. `kind` matches what the row was: "dish" for a dinner
   *  dish, "shaak" for a lunch shaak, "rest" for a restaurant. The caller (not you) decides
   *  what "back" means — you just report the click. */
  onEditItem(kind: "dish" | "shaak" | "rest", id: string): void;
}

const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

const EXTERNAL_LINK_ICON = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M10 14L20 4M15 4h5v5M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" />
  </svg>
);

const PENCIL_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.5 4.5l3 3" />
    <path d="M5 19l1-4L17 4l3 3L9 18z" />
  </svg>
);

type PickKind = "dish" | "shaak" | "rest";

interface PickListProps {
  items: readonly (Dish | Restaurant)[];
  kind: PickKind;
  curId: string | null;
  date: string;
  lastEaten: WeekState["lastEaten"];
  onSelect(id: string): void;
  onEdit(kind: PickKind, id: string): void;
}

/** `pickList()` from the mockup — a `.picks` grid of `.pick` rows, shared by every pool this
 *  picker offers (shaaks, restaurants-by-group, dinner dishes). */
function PickList(props: PickListProps): ReactElement {
  const { items, kind, curId, date, lastEaten, onSelect, onEdit } = props;
  return (
    <div className="picks">
      {items.map((item) => {
        const isRest = kind === "rest";
        const url = isRest ? (item as Restaurant).url : (item as Dish).recipeUrl;
        const meta = isRest
          ? `${WHENS.find((w) => w.id === (item as Restaurant).whenKind)?.n ?? (item as Restaurant).whenKind}${
              (item as Restaurant).note ? " · " + (item as Restaurant).note : ""
            }`
          : (item as Dish).cuisine || ((item as Dish).needsDal ? "wants a dal alongside" : "stands alone");
        const fr = freshness(isRest ? "rest" : "dish", item.id, date, lastEaten);

        function select() {
          onSelect(item.id);
        }
        function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            select();
          }
        }

        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            className={"pick" + (item.id === curId ? " sel" : "")}
            onClick={select}
            onKeyDown={handleKeyDown}
          >
            <span className="col">
              <span className="nm">{item.name}</span>
              <span className="cu">{meta}</span>
            </span>
            <span className="rt">
              {fr ? <span className={`fresh ${fr.cls}`}>{fr.txt}</span> : null}
              {url ? (
                // Same stopPropagation discipline as the pencil below, and for the same
                // reason — see that comment.
                <a className="lnk" href={url} target="_blank" rel="noopener" title="Open recipe" onClick={(e) => e.stopPropagation()}>
                  {EXTERNAL_LINK_ICON}
                </a>
              ) : null}
              {/* LOAD-BEARING ORDER, not incidental. This row is a div with role="button"
                  (see block comment above `pickList` in the mockup: a real <button> can't
                  contain the link/pencil buttons — that's invalid HTML the browser silently
                  un-nests). The mockup's own fix was ordering its ONE delegated click
                  listener so `[data-editdish]` matched before the row's own `[data-pick]`
                  branch. React gives each element its own onClick instead, so the equivalent
                  guarantee here is this button's onClick calling e.stopPropagation() before
                  anything else — that is what stops a click starting on the pencil from also
                  bubbling up and firing the row's onClick (which would select this item).
                  Do not remove the stopPropagation() or reorder this markup on the assumption
                  it's redundant; it is the only thing keeping "edit" and "pick" from both
                  firing on the same click. */}
              <button
                type="button"
                className="mini round"
                title={`Edit ${item.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(kind, item.id);
                }}
              >
                {PENCIL_ICON}
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MealPicker(props: MealPickerProps): ReactElement {
  const { open, weekday, meal, forPerson, weekStart, week, onClose, onReturnToRoster, onEditItem } = props;

  const setSlot = useSetSlot();
  const setOverride = useSetOverride();
  const createDish = useCreateDish();
  const createRestaurant = useCreateRestaurant();

  const person = forPerson ? (PEOPLE.find((p) => p.id === forPerson) ?? null) : null;
  const cur = forPerson ? findOverride(week.overrides, weekday, meal, forPerson) : findItem(week.items, weekday, meal);
  // `cur`'s type is `PlanOverride | PlanItem | null` — TS can't correlate it back to
  // `forPerson` through the ternary above, and `freeText` only exists on `PlanOverride`.
  // Narrow with `in` rather than casting.
  const curFreeText = cur && "freeText" in cur ? cur.freeText : null;
  const theme = week.themeRoster.find((t) => t.id === week.themes[weekday]) ?? week.themeRoster[0];
  const date = servedOn(weekStart, weekday);

  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [rWhen, setRWhen] = useState<WhenKind | null>(null);
  const [fmt, setFmt] = useState<LunchFormat>(cur?.lunchFormat ?? LUNCH_FORMATS[0].id);
  const [freeText, setFreeText] = useState(curFreeText ?? "");
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Fresh filters every time this opens for a (possibly different) slot — see the
  // "mounted once, persistently" note above for why this is an effect and not a remount.
  // `cur` is deliberately read via closure, not as a dep: re-seeding `fmt` whenever an
  // unrelated query refetch changes `cur` mid-browse would yank the format out from under
  // someone who already changed the chip.
  useEffect(() => {
    if (!open) return;
    setQ("");
    setShowAll(false);
    setRWhen(null);
    setFmt(cur?.lunchFormat ?? LUNCH_FORMATS[0].id);
    setFreeText(curFreeText ?? "");
    setNewName("");
    setNewUrl("");
  }, [open, weekday, meal, forPerson]);

  const fmtEntry = LUNCH_FORMATS.find((f) => f.id === fmt) ?? LUNCH_FORMATS[0];
  const isRestNight = meal === "dinner" && theme.kind === "rest" && !showAll;
  const isFirst = meal === "dinner" && theme.id === "firsttime";
  const addKind: PickKind | null = meal === "lunch" ? (fmtEntry.wantsShaak ? "shaak" : null) : isRestNight ? "rest" : "dish";

  function selectItem(kind: PickKind, id: string) {
    const body: { dishId?: string; restaurantId?: string; lunchFormat?: LunchFormat } =
      kind === "rest" ? { restaurantId: id } : kind === "shaak" ? { dishId: id, lunchFormat: fmt } : { dishId: id };
    if (forPerson) {
      setOverride.mutate({ weekStart, weekday, meal, personId: forPerson, ...body }, { onSuccess: onReturnToRoster });
    } else {
      setSlot.mutate({ weekStart, weekday, meal, ...body }, { onSuccess: onClose });
    }
  }

  function handleSaveFormat() {
    if (forPerson) {
      setOverride.mutate({ weekStart, weekday, meal, personId: forPerson, lunchFormat: fmt }, { onSuccess: onReturnToRoster });
    } else {
      setSlot.mutate({ weekStart, weekday, meal, lunchFormat: fmt }, { onSuccess: onClose });
    }
  }

  /** Text matching a known dish, restaurant, or lunch format by name resolves to that id
   *  rather than being stored as a literal string, so it still counts for last-eaten. Only
   *  genuinely unknown text stays free text. Archived dishes/restaurants are not filtered out
   *  of this match — an archived item is still "known" by name, and resolving to its id is
   *  exactly what lets it count for last-eaten. */
  function resolveFreeText(raw: string): { dishId?: string; restaurantId?: string; lunchFormat?: LunchFormat; freeText?: string } {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    const lower = trimmed.toLowerCase();
    const dish = week.dishes.find((d) => d.name.toLowerCase() === lower);
    if (dish) return { dishId: dish.id };
    const rest = week.restaurants.find((r) => r.name.toLowerCase() === lower);
    if (rest) return { restaurantId: rest.id };
    const fmtMatch = LUNCH_FORMATS.find((f) => f.name.toLowerCase() === lower);
    if (fmtMatch) return { lunchFormat: fmtMatch.id };
    return { freeText: trimmed };
  }

  function handleSetFreeText() {
    if (!forPerson) return;
    const resolved = resolveFreeText(freeText);
    setOverride.mutate({ weekStart, weekday, meal, personId: forPerson, ...resolved }, { onSuccess: onReturnToRoster });
  }

  function handleClearOverride() {
    if (!forPerson) return;
    setOverride.mutate({ weekStart, weekday, meal, personId: forPerson }, { onSuccess: onReturnToRoster });
  }

  function handleAdd() {
    if (!addKind) return;
    const name = newName.trim();
    if (!name) {
      nameInputRef.current?.focus();
      return;
    }
    if (addKind === "rest") {
      createRestaurant.mutate(
        { name, groupName: "Try new", whenKind: "dinner", url: normUrl(newUrl) },
        { onSuccess: (data) => selectItem("rest", (data as Restaurant).id) },
      );
    } else if (addKind === "shaak") {
      createDish.mutate(
        { name, kind: "shaak", needsDal: !!fmtEntry.dal },
        { onSuccess: (data) => selectItem("shaak", (data as Dish).id) },
      );
    } else {
      createDish.mutate(
        { name, kind: "dinner", themeIds: [week.themes[weekday]], recipeUrl: normUrl(newUrl) },
        { onSuccess: (data) => selectItem("dish", (data as Dish).id) },
      );
    }
  }

  // --- the meal-specific body -------------------------------------------------------------
  let mealBody: ReactNode;

  if (meal === "lunch") {
    const shaakPool = week.dishes
      .filter((d) => d.kind === "shaak" && !d.archived)
      .filter((d) => showAll || d.needsDal === !!fmtEntry.dal)
      .filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));
    const allShaaks = week.dishes.filter((d) => d.kind === "shaak" && !d.archived);

    mealBody = (
      <>
        <RowLabel label="Format" right="decides which shaaks show up" />
        <div className="chips">
          {LUNCH_FORMATS.map((f) => (
            <button key={f.id} type="button" className="chip" aria-pressed={f.id === fmt} onClick={() => setFmt(f.id)}>
              {f.name}
            </button>
          ))}
        </div>
        {fmtEntry.wantsShaak ? (
          <>
            <RowLabel
              label="Shaak"
              right={showAll ? `showing all ${allShaaks.length}` : fmtEntry.dal ? "ones that want a dal" : "ones that stand alone"}
            />
            <PickList
              items={shaakPool}
              kind="shaak"
              curId={cur?.dishId ?? null}
              date={date}
              lastEaten={week.lastEaten}
              onSelect={(id) => selectItem("shaak", id)}
              onEdit={onEditItem}
            />
          </>
        ) : (
          <>
            <RowLabel label="That's the whole meal" />
            <div className="blank">
              <b>{fmtEntry.name}</b> — no shaak needed. Hit <b>Save</b> and it lands on {DOWS[weekday]}.
            </div>
          </>
        )}
      </>
    );
  } else if (isRestNight) {
    let anyMatch = false;
    const groupSections = REST_GROUPS.map((g) => {
      const pool = week.restaurants.filter(
        (r) => r.groupName === g && !r.archived && (!rWhen || r.whenKind === rWhen) && r.name.toLowerCase().includes(q.toLowerCase()),
      );
      if (pool.length === 0) return null;
      anyMatch = true;
      return (
        <Fragment key={g}>
          <RowLabel label={g} />
          <PickList
            items={pool}
            kind="rest"
            curId={cur?.restaurantId ?? null}
            date={date}
            lastEaten={week.lastEaten}
            onSelect={(id) => selectItem("rest", id)}
            onEdit={onEditItem}
          />
        </Fragment>
      );
    });

    mealBody = (
      <>
        <RowLabel label="When are we going out?" />
        <div className="chips">
          <button type="button" className="chip" aria-pressed={!rWhen} onClick={() => setRWhen(null)}>
            Anything
          </button>
          {WHENS.map((w) => (
            <button
              key={w.id}
              type="button"
              className="chip ink"
              style={{ "--c": `var(${w.c})` } as CSSProperties}
              aria-pressed={rWhen === w.id}
              onClick={() => setRWhen(w.id)}
            >
              {w.n}
            </button>
          ))}
        </div>
        {anyMatch ? groupSections : <div className="blank">Nothing matches that filter.</div>}
      </>
    );
  } else {
    const dinnerPool = week.dishes
      .filter((d) => d.kind === "dinner" && !d.archived)
      .filter((d) => (showAll ? true : isFirst ? !week.lastEaten.dish[d.id] : d.themeIds.includes(theme.id)))
      .filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));

    mealBody = (
      <>
        <RowLabel
          label={showAll ? "Everything" : isFirst ? "Never made" : theme.name}
          right={`${dinnerPool.length} option${dinnerPool.length === 1 ? "" : "s"}`}
        />
        {dinnerPool.length ? (
          <PickList
            items={dinnerPool}
            kind="dish"
            curId={cur?.dishId ?? null}
            date={date}
            lastEaten={week.lastEaten}
            onSelect={(id) => selectItem("dish", id)}
            onEdit={onEditItem}
          />
        ) : (
          <div className="blank">Nothing in this theme yet. Add something below, or show everything.</div>
        )}
      </>
    );
  }

  const planMain = slotLabel(findItem(week.items, weekday, meal), week.dishes, week.restaurants)?.main ?? "nothing decided yet";

  const eyebrow = `${DOWS[weekday]} · ${pretty(date)} · ${meal}` + (meal === "dinner" ? ` · ${theme.name}` : "");
  const title = person
    ? `Just for ${person.name}`
    : meal === "lunch"
      ? "What's for lunch?"
      : isRestNight
        ? "Where are we eating?"
        : "What's for dinner?";

  const footer = (
    <>
      <button type="button" className="chip" aria-pressed={showAll} onClick={() => setShowAll((v) => !v)}>
        Show everything
      </button>
      <span className="hint">Badges nudge. They never block.</span>
      <span className="sp" />
      {person ? (
        <button type="button" className="sticker" onClick={handleClearOverride}>
          Eat the plan
        </button>
      ) : null}
      {meal === "lunch" && !fmtEntry.wantsShaak ? (
        <button type="button" className="sticker hot" onClick={handleSaveFormat}>
          Save
        </button>
      ) : null}
    </>
  );

  return (
    <Sheet open={open} eyebrow={eyebrow} title={title} onClose={onClose} footer={footer}>
      {person ? (
        <div className="banner" style={{ "--pc": person.c } as CSSProperties}>
          Everyone else is having <b>{planMain}</b>. Pick {person.name}&rsquo;s instead — or type a one-off at the bottom.
        </div>
      ) : null}
      <label className="field picksearch">
        {SEARCH_ICON}
        <input data-autofocus placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      {mealBody}

      {addKind ? (
        <>
          <RowLabel label="Not here?" right="just the name is enough" />
          <div className="newrow">
            <label className="field">
              <input
                ref={nameInputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={addKind === "rest" ? "Add a place…" : addKind === "shaak" ? "Add a shaak…" : "Add a dish…"}
              />
            </label>
            {isFirst || addKind === "rest" ? (
              <label className="field">
                <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Link (optional)" />
              </label>
            ) : null}
            <button type="button" className="sticker hot" onClick={handleAdd}>
              Add &amp; use
            </button>
          </div>
        </>
      ) : null}

      {person ? (
        <>
          <RowLabel label="Or something one-off" />
          <div className="newrow">
            <label className="field">
              <input value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="e.g. just khichdi" />
            </label>
            <button type="button" className="sticker" onClick={handleSetFreeText}>
              Set
            </button>
          </div>
        </>
      ) : null}
    </Sheet>
  );
}
