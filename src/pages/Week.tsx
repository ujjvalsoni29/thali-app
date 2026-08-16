import { useEffect, useRef, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router";
import type { Meal, Theme } from "../../shared/api";
import { useClearSlot, useClearWeek, useWeek } from "../lib/queries";
import { useDarkMode } from "../lib/useDarkMode";
import { useToast } from "../lib/useToast";
import { weekTally } from "../lib/tally";
import { DOWS, iso, mondayOf, servedOn, shiftWeek } from "../lib/weeks";
import { Masthead } from "../components/Masthead";
import { ScoreStrip } from "../components/ScoreStrip";
import { NoteTicker } from "../components/NoteTicker";
import { DayCard } from "../components/DayCard";
import { Toast } from "../components/Toast";
import { Confetti } from "../components/Confetti";

/**
 * The week board page: masthead, score strip, note ticker, the seven day cards, toast and
 * confetti. This is the page step 06 lands — it assembles the components each of this
 * step's substeps built (Masthead 06a, ScoreStrip 06b, DayCard/ThemeChip/Slot/EaterChips
 * 06c/06d, NoteTicker/Toast/Confetti 06e) rather than owning any board UI itself.
 *
 * The week key lives in the URL (`/week/2026-08-03`), the one deliberate upgrade over the
 * mockup this step's own task file calls out — a week is linkable and the back button works.
 *
 * What this page deliberately leaves inert, because the components that would make them do
 * something are later steps' work, not this one's: clicking a slot to open the picker (step
 * 07), clicking a theme chip to swap the day's theme (step 07), the eater-chip / "+ someone
 * else" affordance opening the overrides sheet (step 08), and Surprise me / Share the week
 * (steps 10 and 11). Each of those calls `showToast` with a short "not yet" message instead
 * of silently doing nothing, so a click still gets an honest response. **Clear week** and a
 * slot's own clear (✕) button are real, wired to `slot/clear` and `week/clear` — neither
 * needs a picker to exist.
 */
export function Week(): ReactElement {
  const params = useParams<{ weekStart: string }>();
  const navigate = useNavigate();
  const [mode, toggleMode] = useDarkMode();
  const { message: toastMessage, showToast } = useToast();
  const [burstKey, setBurstKey] = useState(0);
  const wasCompleteRef = useRef(false);

  // A malformed or missing :weekStart param (there shouldn't be one — "/" redirects to a
  // real Monday — but a hand-typed URL could still hit this) falls back to the current week
  // rather than rendering a broken page.
  const weekStart = params.weekStart && /^\d{4}-\d{2}-\d{2}$/.test(params.weekStart) ? params.weekStart : iso(mondayOf(new Date()));

  const { data: week, isLoading, isError } = useWeek(weekStart);
  const clearWeek = useClearWeek();
  const clearSlot = useClearSlot();

  useEffect(() => {
    if (!week) return;
    const nowComplete = weekTally(week).filled === 14;
    if (nowComplete && !wasCompleteRef.current) {
      setBurstKey((k) => k + 1);
    }
    wasCompleteRef.current = nowComplete;
  }, [week]);

  function goToWeek(nextWeekStart: string) {
    navigate(`/week/${nextWeekStart}`);
  }

  function handleClearWeek() {
    clearWeek.mutate(
      { weekStart },
      {
        onSuccess: () => showToast("Week emptied. The themes stayed where they were."),
        onError: () => showToast("Could not clear the week — try again."),
      },
    );
  }

  function handleClearSlot(weekday: number, meal: Meal) {
    clearSlot.mutate({ weekStart, weekday, meal });
  }

  const notYet = (what: string) => () => showToast(`${what} lands in a later step.`);

  return (
    <div className="shell">
      <Masthead
        weekStart={weekStart}
        onPrevWeek={() => goToWeek(shiftWeek(weekStart, -1))}
        onNextWeek={() => goToWeek(shiftWeek(weekStart, 1))}
        onSurprise={notYet("Surprise me")}
        onShareWeek={notYet("Share the week")}
        onClearWeek={handleClearWeek}
        mode={mode}
        onToggleMode={toggleMode}
      />

      {isLoading || !week ? (
        <p className="lab">{isError ? "Could not load this week." : "Loading…"}</p>
      ) : (
        <>
          <ScoreStrip tally={weekTally(week)} />
          <NoteTicker />
          <main className="board">
            {DOWS.map((_, weekday) => {
              const date = servedOn(weekStart, weekday);
              const isToday = date === iso(new Date());
              const themeId = week.themes[weekday];
              const theme: Theme = week.themeRoster.find((t) => t.id === themeId) ?? week.themeRoster[0];
              return (
                <DayCard
                  key={weekday}
                  weekday={weekday}
                  date={date}
                  isToday={isToday}
                  theme={theme}
                  week={week}
                  onOpenSlotPicker={notYet("Picking a meal")}
                  onClearSlot={handleClearSlot}
                  onOpenThemePicker={notYet("Swapping the theme")}
                  onOpenOverrides={notYet("Per-person overrides")}
                />
              );
            })}
          </main>
        </>
      )}

      <Toast message={toastMessage} />
      <Confetti burstKey={burstKey} />
    </div>
  );
}
