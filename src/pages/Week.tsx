import { useEffect, useRef, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router";
import type { Meal, PersonId, Theme } from "../../shared/api";
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
import { MealPicker } from "../components/MealPicker";
import { ThemePicker } from "../components/ThemePicker";
import { DishEditor } from "../components/DishEditor";
import { ThemeEditor } from "../components/ThemeEditor";

/**
 * The week board page: masthead, score strip, note ticker, the seven day cards, the picker
 * sheets, toast and confetti. This is the page step 06 lands and step 07 wires up — it
 * assembles the components each step's substeps built (Masthead 06a, ScoreStrip 06b,
 * DayCard/ThemeChip/Slot/EaterChips 06c/06d, NoteTicker/Toast/Confetti 06e, Sheet/MealPicker/
 * ThemePicker/DishEditor/ThemeEditor 07a-f) rather than owning any board or sheet UI itself.
 *
 * The week key lives in the URL (`/week/2026-08-03`), the one deliberate upgrade over the
 * mockup step 06's own task file calls out — a week is linkable and the back button works.
 *
 * **The sheet-navigation model** (step 07): there is one picker, one theme picker, one dish
 * editor and one theme editor, and at most one of the four is ever open at a time. Rather than
 * a generic back-stack of closures (the mockup's `edCtx.back`), this page tracks four small
 * pieces of state — the most recent session for each sheet kind — plus a single `active`
 * pointer naming which one is currently shown. That's enough because the "back" relationship
 * is fixed, not dynamic: `DishEditor` is only ever reached from `MealPicker`'s pencil, and
 * `ThemeEditor` only ever from `ThemePicker`'s, so `onDone` can name its target directly
 * (`"picker"` / `"themePick"`) instead of carrying a callback. All four sheet components are
 * mounted persistently (like `Toast`) with `open` toggling off the `active` pointer — never
 * conditionally rendered — because `Sheet`'s arrival-rotation transition only plays when
 * `open` flips false→true on an already-mounted node; a fresh mount would start already in
 * its `.on` state with nothing to animate from. Each component resets its own session state
 * (search text, format chips, form fields) via its own effect keyed on `open` — see
 * `MealPicker.tsx`'s and `DishEditor.tsx`'s header comments.
 *
 * What this page still deliberately leaves inert, because the components that would make
 * them do something are step 08/10/11's work, not this one's: the eater-chip / "+ someone
 * else" affordance opening the overrides sheet, and Surprise me / Share the week. Each of
 * those calls `showToast` with a short "not yet" message instead of silently doing nothing.
 * **Clear week**, a slot's own clear (✕) button, the meal picker, the theme picker and both
 * editors are all real.
 */
export function Week(): ReactElement {
  const params = useParams<{ weekStart: string }>();
  const navigate = useNavigate();
  const [mode, toggleMode] = useDarkMode();
  const { message: toastMessage, showToast } = useToast();
  const [burstKey, setBurstKey] = useState(0);
  const wasCompleteRef = useRef(false);

  // --- sheet navigation (step 07) --------------------------------------------------------
  type ActiveSheet = "picker" | "themePick" | "editItem" | "editTheme" | null;
  const [active, setActive] = useState<ActiveSheet>(null);
  const [picker, setPicker] = useState<{ weekday: number; meal: Meal; forPerson: PersonId | null } | null>(null);
  const [themePick, setThemePick] = useState<{ weekday: number } | null>(null);
  const [editItem, setEditItem] = useState<{ kind: "dish" | "shaak" | "rest"; id: string } | null>(null);
  const [editTheme, setEditTheme] = useState<{ id: string } | null>(null);

  function closeSheets() {
    setActive(null);
  }
  function openSlotPicker(weekday: number, meal: Meal) {
    setPicker({ weekday, meal, forPerson: null });
    setActive("picker");
  }
  function openThemePickerSheet(weekday: number) {
    setThemePick({ weekday });
    setActive("themePick");
  }
  function openEditItem(kind: "dish" | "shaak" | "rest", id: string) {
    setEditItem({ kind, id });
    setActive("editItem");
  }
  function openEditTheme(id: string) {
    setEditTheme({ id });
    setActive("editTheme");
  }

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
                  onOpenSlotPicker={openSlotPicker}
                  onClearSlot={handleClearSlot}
                  onOpenThemePicker={openThemePickerSheet}
                  onOpenOverrides={notYet("Per-person overrides")}
                />
              );
            })}
          </main>

          <MealPicker
            open={active === "picker"}
            weekday={picker?.weekday ?? 0}
            meal={picker?.meal ?? "dinner"}
            forPerson={picker?.forPerson ?? null}
            weekStart={weekStart}
            week={week}
            onClose={closeSheets}
            onEditItem={openEditItem}
          />
          <ThemePicker
            open={active === "themePick"}
            weekday={themePick?.weekday ?? 0}
            weekStart={weekStart}
            week={week}
            onClose={closeSheets}
            onEditTheme={openEditTheme}
          />
          <DishEditor
            open={active === "editItem"}
            kind={editItem?.kind ?? "dish"}
            id={editItem?.id ?? null}
            week={week}
            onClose={closeSheets}
            onDone={() => setActive("picker")}
          />
          <ThemeEditor
            open={active === "editTheme"}
            id={editTheme?.id ?? ""}
            week={week}
            onClose={closeSheets}
            onDone={() => setActive("themePick")}
          />
        </>
      )}

      <Toast message={toastMessage} />
      <Confetti burstKey={burstKey} />
    </div>
  );
}
