import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * The drag-and-drop engine and shared card/bin primitives for The Kitchen (tasks/step-09.md
 * §09b). Every tab (Dinner 09c, Shaaks 09d, Restaurants 09e) is built out of `DropBin` +
 * `DragCard` from this file so the mechanics — and the "one `applyDrop`" contract the step
 * asks for — live in exactly one place. The Themes tab (09f) doesn't drag, so it doesn't use
 * any of this.
 *
 * Ported from `Main/thali-mockup.html`'s document-level `dragstart`/`dragover`/`drop`
 * listeners and `sourceBin()` (~lines 1029-1060), translated into React idiom: instead of
 * reading `.dragging`/`[data-drop]` back off the DOM, the bin a card was picked up FROM is
 * captured directly in React state at `dragstart` (`beginDrag(payload, fromBin)`), passed in
 * by the bin that rendered the card. That is the same information `sourceBin()` recovers by
 * querying `.dcard.dragging`'s closest `[data-drop]` — just carried as state instead of
 * re-derived from the DOM — and it's what satisfies 09b's "the dinner move needs `from` as
 * well as `to`" requirement.
 */

export type DragKind = "dish" | "shaak" | "rest";

export interface DragPayload {
  kind: DragKind;
  id: string;
}

interface DragState {
  payload: DragPayload | null;
  fromBin: string | null;
  overBin: string | null;
}

const IDLE: DragState = { payload: null, fromBin: null, overBin: null };

export interface KitchenDragApi {
  dragging: DragPayload | null;
  overBin: string | null;
  beginDrag(payload: DragPayload, fromBin: string): void;
  endDrag(): void;
  dragOverBin(binId: string): void;
  dragLeaveBin(binId: string): void;
  dropOnBin(binId: string): void;
}

const KitchenDragContext = createContext<KitchenDragApi | null>(null);

export function useKitchenDrag(): KitchenDragApi {
  const ctx = useContext(KitchenDragContext);
  if (!ctx) throw new Error("useKitchenDrag() used outside a KitchenDragProvider");
  return ctx;
}

export interface KitchenDragProviderProps {
  /** Fired once per drop, already resolved to (payload, target bin, source bin) — the ONE
   *  `applyDrop(payload, target, from)` tasks/step-09.md §09b calls for. `KitchenPanel` is the
   *  only thing that implements this; this provider only owns drag mechanics, never the
   *  per-roster meaning of a drop. */
  onDrop(payload: DragPayload, target: string, from: string): void;
  children: ReactNode;
}

export function KitchenDragProvider(props: KitchenDragProviderProps): ReactElement {
  const { onDrop, children } = props;
  const [state, setState] = useState<DragState>(IDLE);

  const beginDrag = useCallback((payload: DragPayload, fromBin: string) => {
    setState({ payload, fromBin, overBin: null });
  }, []);
  const endDrag = useCallback(() => setState(IDLE), []);
  const dragOverBin = useCallback((binId: string) => {
    setState((s) => (s.payload === null || s.overBin === binId ? s : { ...s, overBin: binId }));
  }, []);
  const dragLeaveBin = useCallback((binId: string) => {
    setState((s) => (s.overBin === binId ? { ...s, overBin: null } : s));
  }, []);
  const dropOnBin = useCallback(
    (binId: string) => {
      setState((s) => {
        if (s.payload && s.fromBin !== null) onDrop(s.payload, binId, s.fromBin);
        return IDLE;
      });
    },
    [onDrop],
  );

  const api = useMemo<KitchenDragApi>(
    () => ({ dragging: state.payload, overBin: state.overBin, beginDrag, endDrag, dragOverBin, dragLeaveBin, dropOnBin }),
    [state.payload, state.overBin, beginDrag, endDrag, dragOverBin, dragLeaveBin, dropOnBin],
  );

  return <KitchenDragContext.Provider value={api}>{children}</KitchenDragContext.Provider>;
}

// ---- card + bin primitives -----------------------------------------------------------------

/** Both icons on a card get the shared, already-fixed `.mini.round` circle (base.css) — a
 *  small circle with zero padding baked in. The mockup needed its own `.dcard .mini`
 *  override for this (tasks/step-09.md §09b: "The pencil takes padding: 0 — the shared
 *  `.mini` rule contributes non-zero padding, which inside a small circle shoves the icon
 *  off-centre. That was a real bug"); this app fixed that bug once, at the shared rule, back
 *  in step 07 (see base.css's own comment), so reusing "mini round" here is what makes both
 *  the recipe link and the pencil come out centred with no per-file override needed. */
const EXTERNAL_LINK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M10 14L20 4M15 4h5v5M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" />
  </svg>
);

const PENCIL_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.5 4.5l3 3" />
    <path d="M5 19l1-4L17 4l3 3L9 18z" />
  </svg>
);

const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export interface DragCardProps {
  kind: DragKind;
  id: string;
  name: string;
  /** The id of the bin currently rendering this card — captured at `dragstart` so a drop
   *  elsewhere always knows where the card came FROM, not just where it landed. */
  fromBin: string;
  /** A recipe/menu link, when there is one — ported from `dcard()`'s `d.url` branch. */
  url?: string | null;
  onEdit(): void;
}

/** `dcard()` from the mockup (~line 959) — one draggable pill, reused by the Dinner, Shaaks
 *  and Restaurants tabs (never the Themes tab, which isn't draggable). */
export function DragCard(props: DragCardProps): ReactElement {
  const { kind, id, name, fromBin, url, onEdit } = props;
  const drag = useKitchenDrag();
  const isDragging = drag.dragging?.kind === kind && drag.dragging.id === id;

  return (
    <div
      className={"dcard" + (isDragging ? " dragging" : "")}
      draggable
      onDragStart={(e) => {
        drag.beginDrag({ kind, id }, fromBin);
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", `${kind}:${id}`);
        } catch {
          // Some browsers (old Safari) can throw on setData for certain MIME types — the
          // drag still works without it, since this app reads state, not the dataTransfer.
        }
      }}
      onDragEnd={drag.endDrag}
    >
      <span className="nm">{name}</span>
      <span className="rt">
        {url ? (
          // stopPropagation for the same reason MealPicker's PickList link does: this card's
          // own onEdit button sits inside it, and a click starting there must not also count
          // as picking the card up (drag start needs a real press-and-move, but a stray click
          // handler firing twice is still worth guarding against, and it matches the pattern
          // used everywhere else in this app for "row contains its own buttons").
          <a className="mini round" href={url} target="_blank" rel="noopener" title="Recipe" onClick={(e) => e.stopPropagation()}>
            {EXTERNAL_LINK_ICON}
          </a>
        ) : null}
        <button
          type="button"
          className="mini round"
          title={`Edit ${name}`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          {PENCIL_ICON}
        </button>
      </span>
    </div>
  );
}

export interface DropBinProps {
  /** The bin's own id in this tab's convention — e.g. `theme:${themeId}`, `dal:yes`,
   *  `rest:g:${group}`. This is both the drop target's name and, when a card was picked up
   *  from here, the `from` a drop elsewhere reports. */
  binId: string;
  /** A CSS colour value (`var(--marigold)`, `var(--ink-3)`, …) — becomes `--accent` for the
   *  bin's tag pill, same as the mockup's `bin(id, name, accent, …)`. */
  accent: string;
  label: ReactNode;
  count: number;
  children: ReactNode;
}

/** `bin()` from the mockup (~line 966) — a tag-pill header plus a `.cards` drop zone. Goes
 *  marigold with a dashed outline while something draggable is over it (`.bin.over`, tasks/
 *  step-09.md §09b). */
export function DropBin(props: DropBinProps): ReactElement {
  const { binId, accent, label, count, children } = props;
  const drag = useKitchenDrag();
  const isOver = drag.dragging !== null && drag.overBin === binId;

  return (
    <div className={"bin" + (isOver ? " over" : "")} style={{ "--accent": accent } as CSSProperties}>
      <div className="binhead">
        <span className="tagname">{label}</span>
        <span className="gc">{count}</span>
        <span className="rule" />
      </div>
      <div
        className="cards"
        onDragOver={(e) => {
          if (!drag.dragging) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          drag.dragOverBin(binId);
        }}
        onDragLeave={() => drag.dragLeaveBin(binId)}
        onDrop={(e) => {
          e.preventDefault();
          drag.dropOnBin(binId);
        }}
      >
        {count > 0 ? children : <div className="nobin">drop something here</div>}
      </div>
    </div>
  );
}

// ---- shared toolbar bits --------------------------------------------------------------------

export interface KitchenSearchFieldProps {
  value: string;
  onChange(value: string): void;
}

/** The `#ksearch` field every tab but Themes carries in its `.tools` row. A plain controlled
 *  input — no debounce needed, filtering is a client-side `.includes()` over an already-loaded
 *  roster (`Main/thali-mockup.html`'s `match()`, ~line 957). */
export function KitchenSearchField(props: KitchenSearchFieldProps): ReactElement {
  const { value, onChange } = props;
  return (
    <label className="field">
      {SEARCH_ICON}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search the kitchen…" />
    </label>
  );
}

/** Case-insensitive name match — `match()` from the mockup, shared so every tab filters the
 *  same way. */
export function matchesQuery(name: string, query: string): boolean {
  return name.toLowerCase().includes(query.toLowerCase());
}
