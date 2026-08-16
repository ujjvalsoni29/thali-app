import type { KeyboardEvent, MouseEvent, ReactElement } from "react";
import type { SlotLabel } from "../lib/slot";

/**
 * One lunch/dinner slot on a `DayCard`. Ported VERBATIM from `Main/thali-mockup.html`'s
 * `.slot` / `.slot.empty` markup/CSS (renderBoard(), ~lines 894-907) — plan §1a: mockup
 * first, then the app.
 */
export interface SlotProps {
  /** null = empty slot */
  label: SlotLabel | null;
  /** null = no badge to show */
  freshness: { cls: string; txt: string } | null;
  /** opens the picker — no-op wiring point for now, later step */
  onClick(): void;
  /** REAL: clears this slot. Only rendered/attached when label is non-null. */
  onClear(): void;
}

export function Slot(props: SlotProps): ReactElement {
  const { label, freshness, onClick, onClear } = props;

  if (!label) {
    return (
      <button type="button" className="slot empty" onClick={onClick}>
        + pick one
      </button>
    );
  }

  function handleClearClick(e: MouseEvent) {
    e.stopPropagation();
    onClear();
  }

  function handleClearKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClear();
    }
  }

  return (
    <button type="button" className="slot" onClick={onClick}>
      {/* Not a nested <button> — a button inside a button is invalid HTML and browsers
          silently un-nest it (the same trap the mockup's own comments call out for
          picker rows), so this is a span with a manual role/keyboard handler instead. */}
      <span
        className="clr"
        role="button"
        tabIndex={0}
        title="Clear"
        onClick={handleClearClick}
        onKeyDown={handleClearKeyDown}
      >
        <svg
          viewBox="0 0 24 24"
          width="10"
          height="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </span>
      {label.out ? <span className="out">Night off</span> : null}
      <span className="dish">{label.main}</span>
      <span className="sub">{label.sub}</span>
      {freshness ? <span className={`fresh ${freshness.cls}`}>{freshness.txt}</span> : null}
    </button>
  );
}
