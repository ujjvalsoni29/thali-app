import type { CSSProperties, ReactElement } from "react";
import type { WeekState } from "../../shared/api";
import { Sheet } from "./Sheet";
import { Poster } from "../share/Poster";
import { copyWeekText } from "../share/weekText";
import { weekTally } from "../lib/tally";

/**
 * "Share the week" — the sheet that previews the printable poster before it goes to the
 * family group. Ported VERBATIM from `Main/thali-mockup.html`'s `openShare()` (~lines
 * 1467-1486) — plan §1a: mockup first, then the app. The poster itself (`Poster.tsx`) is
 * reused here at a scaled-down preview size AND at full size in the always-mounted
 * `PrintRoot` — one component, two contexts, rather than two copies of the markup the way
 * the mockup's `posterHTML()` string was inlined into both `openShare()` and `#printroot`.
 *
 * `Sheet`'s `wide` prop is derived fresh from `open` here — nothing persists it, per
 * `Sheet.tsx`'s own header comment about not carrying a stale `true` forward.
 *
 * **Save as PDF** closes the sheet first, then waits ~220ms before calling `window.print()`
 * — otherwise the sheet's own closing animation is still on screen when the print capture
 * happens (tasks/step-11.md §11c).
 */
export interface ShareSheetProps {
  open: boolean;
  week: WeekState;
  onClose(): void;
  onToast(message: string): void;
}

const CLOSE_BEFORE_PRINT_MS = 220;

export function ShareSheet(props: ShareSheetProps): ReactElement {
  const { open, week, onClose, onToast } = props;
  const tally = weekTally(week);
  const missing = 14 - tally.filled;

  function handleSaveAsPdf() {
    onClose();
    window.setTimeout(() => window.print(), CLOSE_BEFORE_PRINT_MS);
  }

  function handleCopyAsText() {
    copyWeekText(week, onToast);
  }

  const footer = (
    <>
      <button type="button" className="sticker" onClick={handleCopyAsText}>
        Copy as text
      </button>
      <span className="hint">US Letter · prints in colour · always the light press</span>
      <span className="sp" />
      <button type="button" className="sticker hot" onClick={handleSaveAsPdf}>
        Save as PDF
      </button>
    </>
  );

  return (
    <Sheet open={open} wide={open} eyebrow="Share the week" title="One sheet for the family group" onClose={onClose} footer={footer}>
      {missing > 0 ? (
        <div className="banner" style={{ "--pc": "var(--marigold)" } as CSSProperties}>
          <b>
            {missing} slot{missing === 1 ? "" : "s"} still empty.
          </b>{" "}
          They&rsquo;ll print as <i>not decided</i> — fine if that&rsquo;s the point, otherwise hit{" "}
          <b>Surprise me</b> first.
        </div>
      ) : null}
      <div className="posterframe">
        <div className="posterscale">
          <Poster week={week} />
        </div>
      </div>
    </Sheet>
  );
}
