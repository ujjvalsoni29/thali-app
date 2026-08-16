import { useEffect, useRef, type ReactElement, type ReactNode } from "react";
import "../theme/sheet.css";

/**
 * The modal shell every sheet in the app renders inside of — the picker (step 07), the
 * overrides sheet (step 08), The Kitchen's editors (step 09) and Share the week (step 11).
 * Ported VERBATIM from `Main/thali-mockup.html`'s `openSheet()`/`closeSheet()`/`head()`
 * (~lines 1090-1099) — plan §1a: mockup first, then the app.
 *
 * Two things the mockup's imperative DOM model did that this component does differently on
 * purpose:
 *
 * - The mockup kept one `#sheet` element in the DOM for the app's whole life and rewrote its
 *   `innerHTML` on every `openSheet()` call, so `sh.classList.remove('wide')` had to run
 *   first or a previous sheet's `wide` state would leak into the next one. Here `wide` is a
 *   plain prop, re-derived by the caller from its own sheet-state on every render — there is
 *   no persistent DOM node to leak from, so there is nothing to clear. **Callers must still
 *   derive `wide` fresh from current state, not carry a stale `true` forward** — the
 *   contract moved from "remember to clear a class" to "don't hold onto a stale prop value",
 *   which is the same rule stated for props instead of DOM classes.
 * - Escape and outside-scrim-click both call `onClose`. Individual `.pick[role="button"]`
 *   rows own their own Enter/Space handling (the same pattern `Slot.tsx`'s `.clr` span
 *   uses) rather than Sheet centralising it the way the mockup's global keydown listener did
 *   — there is no single global click/keydown listener in this app the way the mockup had one
 *   for its whole page.
 *
 * `Sheet` is always mounted (like `Toast.tsx`) and toggles the `.on` class off `open` for the
 * scrim-fade + arrival-rotation transition — it does not unmount its children when closed, so
 * the closing animation has something to animate.
 */
export interface SheetProps {
  open: boolean;
  /** The wide variant step 11's print-sheet preview needs. See the class-note above: this
   *  must be derived fresh from the caller's own state every render. */
  wide?: boolean;
  eyebrow: string;
  title: string;
  onClose(): void;
  /** `.sheetbody` content. */
  children: ReactNode;
  /** `.sheetfoot` content — omitted entirely (no footer bar) when not given. */
  footer?: ReactNode;
}

export function Sheet(props: SheetProps): ReactElement {
  const { open, wide, eyebrow, title, onClose, children, footer } = props;
  const bodyRef = useRef<HTMLDivElement>(null);

  // Focus the search field (or whatever else opts in) on open — ported from openSheet()'s
  // `sh.querySelector('input[data-autofocus]')` + `setTimeout(..., 50)`, the delay giving
  // the arrival transition a frame to start before focus (and any resulting mobile keyboard)
  // steals it.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      bodyRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Escape closes — ported from the mockup's `keydown` listener's `if(e.key === 'Escape')`
  // branch. Scoped to while this sheet is open rather than one listener for the app's whole
  // life, since only one sheet is ever open at a time.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div className={"scrim" + (open ? " on" : "")} onClick={onClose} />
      <div className={"sheet" + (open ? " on" : "") + (wide ? " wide" : "")}>
        <div className="sheethead">
          <div className="eye">{eyebrow}</div>
          <h3>{title}</h3>
          <button type="button" className="x" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="sheetbody" ref={bodyRef}>
          {children}
        </div>
        {footer ? <div className="sheetfoot">{footer}</div> : null}
      </div>
    </>
  );
}

/** `rl(label, right)` from the mockup — the small "section label + optional right-aligned
 *  hint + ruled line" row that introduces a `.picks` list or a `.chips` group inside a
 *  sheet's body. */
export interface RowLabelProps {
  label: ReactNode;
  right?: ReactNode;
}

export function RowLabel(props: RowLabelProps): ReactElement {
  const { label, right } = props;
  return (
    <div className="rl">
      <span className="t">{label}</span>
      {right ? <span className="r">{right}</span> : null}
      <span className="rule" />
    </div>
  );
}
