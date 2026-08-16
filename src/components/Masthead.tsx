import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { MONTHS, addDays, iso, mondayOf, parse } from "../lib/weeks";
import "../theme/masthead.css";

/**
 * The week board's masthead — brand mark, week-nav pill and the row of sticker
 * buttons (Surprise me / Share the week / Clear week / Idea bank / mode toggle).
 * Ported VERBATIM from `Main/thali-mockup.html` (masthead CSS ~lines 113-133,
 * markup ~lines 480-523, `renderWeekLabel()` ~lines 1551-1555 and the arm-then-fire
 * `clearWeek()` ~lines 1507-1523) — plan §1a: mockup first, then the app, no
 * re-derivation.
 */
export interface MastheadProps {
  /** ISO Monday of the week currently shown, e.g. "2026-08-03" */
  weekStart: string;
  onPrevWeek(): void;
  onNextWeek(): void;
  onSurprise(): void;
  onShareWeek(): void;
  /** Called ONLY on the confirming (second) click — the component owns arm/fire state. */
  onClearWeek(): void;
  mode: "light" | "dark";
  onToggleMode(): void;
}

const CLEAR_ARM_MS = 3500;

export function Masthead(props: MastheadProps): ReactElement {
  const { weekStart, onPrevWeek, onNextWeek, onSurprise, onShareWeek, onClearWeek, mode, onToggleMode } =
    props;

  const [armed, setArmed] = useState(false);
  const armTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (armTimer.current !== null) {
        window.clearTimeout(armTimer.current);
      }
    };
  }, []);

  function handleClearClick() {
    if (armed) {
      if (armTimer.current !== null) {
        window.clearTimeout(armTimer.current);
        armTimer.current = null;
      }
      setArmed(false);
      onClearWeek();
      return;
    }
    setArmed(true);
    armTimer.current = window.setTimeout(() => {
      armTimer.current = null;
      setArmed(false);
    }, CLEAR_ARM_MS);
  }

  const a = parse(weekStart);
  const b = addDays(a, 6);
  const m = mondayOf(new Date());
  const rangeLabel = `${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}`;
  const statusLabel = weekStart === iso(m) ? "This week" : a < m ? "Past week" : "Upcoming";

  return (
    <header className="masthead">
      <div className="brand">
        <svg className="mark" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="34" cy="34" r="23" fill="var(--pink)" opacity=".85" />
          <circle cx="32" cy="32" r="23" fill="var(--stock)" stroke="var(--ink)" strokeWidth="3.4" />
          <circle cx="32" cy="32" r="16.5" fill="none" stroke="var(--ink)" strokeWidth="1.5" opacity=".3" />
          <circle cx="32" cy="18.5" r="6" fill="var(--marigold)" stroke="var(--ink)" strokeWidth="2.6" />
          <circle cx="45.5" cy="32" r="6" fill="var(--teal)" stroke="var(--ink)" strokeWidth="2.6" />
          <circle cx="32" cy="45.5" r="6" fill="var(--blue)" stroke="var(--ink)" strokeWidth="2.6" />
          <circle cx="18.5" cy="32" r="6" fill="var(--tangerine)" stroke="var(--ink)" strokeWidth="2.6" />
          <circle cx="32" cy="32" r="4.6" fill="var(--ink)" />
        </svg>
        <div className="txt">
          <span className="wm">Thali</span>
          <span className="guj">થાળી</span>
          <span className="sub">What the five of us are eating this week</span>
        </div>
      </div>

      <div className="weeknav">
        <button type="button" aria-label="Previous week" onClick={onPrevWeek}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="weeklabel">
          <b>{rangeLabel}</b>
          <span>{statusLabel}</span>
        </div>
        <button type="button" aria-label="Next week" onClick={onNextWeek}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        className="sticker hot"
        title="Fill the empty slots, staying in theme, skipping anything eaten in the last 2 weeks"
        onClick={onSurprise}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
          <path d="M12 2.5l2 5.2 5.5 1.1-3.8 4 .9 5.9L12 16l-4.6 2.7.9-5.9-3.8-4L10 7.7z" />
        </svg>
        Surprise me
      </button>

      <button
        type="button"
        className="sticker"
        title="Make a printable sheet for the family group"
        onClick={onShareWeek}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 9V4h10v5M7 18v3h10v-3" />
          <rect x="4" y="9" width="16" height="9" rx="1.5" />
        </svg>
        Share the week
      </button>

      <button
        type="button"
        className={armed ? "sticker hot" : "sticker"}
        title="Empty every slot on this week"
        onClick={handleClearClick}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
        </svg>
        {armed ? "Sure? Click again" : "Clear week"}
      </button>

      {/* Assumes thali-app/ and Main/ are sibling folders on disk — this relative path
          may need adjustment once the app is actually served rather than opened via
          file:// like the mockup was. */}
      <a
        className="sticker"
        href="../Main/thali-idea-bank.html"
        target="_blank"
        rel="noopener"
        title="220 vegetarian dinners and 24 theme ideas"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5.5A2 2 0 016 4h5v16H6a2 2 0 01-2-1.5zM20 5.5A2 2 0 0018 4h-5v16h5a2 2 0 002-1.5z" />
        </svg>
        Idea bank
      </a>

      <button
        type="button"
        className="sticker sq"
        title="Light / dark"
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        onClick={onToggleMode}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      </button>
    </header>
  );
}
