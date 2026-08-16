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
import { OverridesSheet } from "../components/OverridesSheet";
import { KitchenPanel } from "../components/kitchen/KitchenPanel";

/**
 * The week board page: masthead, score strip, note ticker, the seven day cards, the picker
 * sheets, toast and confetti. This is the page step 06 lands and step 07 wires up — it
 * assembles the components each step's substeps built (Masthead 06a, ScoreStrip 06b,
 * DayCard/ThemeChip/Slot/EaterChips 06c/06d, NoteTicker/Toast/Confetti 06e, Sheet/MealPicker/
 * ThemePicker/DishEditor/ThemeEditor 07a-f, OverridesSheet step 08a) rather than owning any
 * board or sheet UI itself.
 *
 * The week key lives in the URL (`/week/2026-08-03`), the one deliberate upgrade over the
 * mockup step 06's own task file calls out — a week is linkable and the back button works.
 *
 * **The sheet-navigation model** (step 07, extended by step 08): there is one picker, one
 * theme picker, one dish editor, one theme editor and one roster (overrides) sheet, and at
 * most one of the five is ever open at a time. Rather than a generic back-stack of closures
 * (the mockup's `edCtx.back`), this page tracks one small piece of state per sheet kind — the
 * most recent session for that kind — plus a single `active` pointer naming which one is
 * currently shown. That's enough because the "back" relationship is fixed, not dynamic:
 * `DishEditor` is only ever reached from `MealPicker`'s pencil, `ThemeEditor` only ever from
 * `ThemePicker`'s, and `MealPicker` in person mode (`forPerson` set) is only ever reached from
 * `OverridesSheet`'s "Pick…"/"Change" — so each "done" callback can name its target directly
 * (`"picker"` / `"themePick"` / `"overrides"`) instead of carrying a closure. Step 08's own
 * addition: `openPersonPicker` opens `MealPicker` with `forPerson` set while leaving `overrides`
 * state untouched, so `MealPicker`'s `onReturnToRoster` (called on a successful person-mode
 * save/clear instead of `onClose`) can just flip `active` back to `"overrides"` — the same
 * roster sheet, same weekday/meal, per tasks/step-08.md §08b ("returns to the roster sheet, not
 * to the board — you are usually setting more than one"). All five sheet components are
 * mounted persistently (like `Toast`) with `open` toggling off the `active` pointer — never
 * conditionally rendered — because `Sheet`'s arrival-rotation transition only plays when
 * `open` flips false→true on an already-mounted node; a fresh mount would start already in
 * its `.on` state with nothing to animate from. Each component resets its own session state
 * (search text, format chips, form fields) via its own effect keyed on `open` — see
 * `MealPicker.tsx`'s and `DishEditor.tsx`'s header comments.
 *
 * Step 09 adds `KitchenPanel`, which is NOT part of the sheet stack above — it renders inline
 * on the page itself (like the board), with its own open/closed and active-tab state. It
 * reaches the same `DishEditor` the picker's pencil does, via `editItemOrigin` ("picker" vs
 * "kitchen") deciding what `onDone` returns to — see that state's own comment below.
 *
 * What this page still deliberately leaves inert, because the components that would make
 * them do something are step 10/11's work, not this one's: Surprise me and Share the week.
 * Each of those calls `showToast` with a short "not yet" message instead of silently doing
 * nothing. **Clear week**, a slot's own clear (✕) button, the meal picker (plan-wide and
 * per-person), the theme picker, both editors and the roster/overrides sheet are all real.
 */
export function Week(): ReactElement {
  const params = useParams<{ weekStart: string }>();
  const navigate = useNavigate();
  const [mode, toggleMode] = useDarkMode();
  const { message: toastMessage, showToast } = useToast();
  const [burstKey, setBurstKey] = useState(0);
  const wasCompleteRef = useRef(false);

  // --- sheet navigation (step 07, extended by step 08) -----------------------------------
  type ActiveSheet = "picker" | "themePick" | "editItem" | "editTheme" | "overrides" | null;
  const [active, setActive] = useState<ActiveSheet>(null);
  const [picker, setPicker] = useState<{ weekday: number; meal: Meal; forPerson: PersonId | null } | null>(null);
  const [themePick, setThemePick] = useState<{ weekday: number } | null>(null);
  const [editItem, setEditItem] = useState<{ kind: "dish" | "shaak" | "rest"; id: string | null } | null>(null);
  // Where a DishEditor session was opened FROM — MealPicker's own pencil (07f) always closes
  // back to the picker it came from; The Kitchen's pencil, and its "+ Dish"/"+ Shaak"/
  // "+ Place" stickers (09c-09e), close back to nothing — The Kitchen isn't a sheet, it's
  // already sitting on the page underneath, so "back" there just means closing the sheet
  // stack (step-09.md is what adds the second possible origin; step 07 only ever had one).
  const [editItemOrigin, setEditItemOrigin] = useState<"picker" | "kitchen">("picker");
  const [editTheme, setEditTheme] = useState<{ id: string } | null>(null);
  const [overrides, setOverrides] = useState<{ weekday: number; meal: Meal } | null>(null);

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
    setEditItemOrigin("picker");
    setActive("editItem");
  }
  // The Kitchen's own pencil (any dcard in the Dinner/Shaaks/Restaurants tabs) — same sheet,
  // different return address than the picker's pencil above.
  function openKitchenEditItem(kind: "dish" | "shaak" | "rest", id: string) {
    setEditItem({ kind, id });
    setEditItemOrigin("kitchen");
    setActive("editItem");
  }
  // The Kitchen's "+ Dish" / "+ Shaak" / "+ Place" stickers — DishEditor already has a create
  // mode (id === null); this just routes it there instead of at an existing row.
  function openKitchenNewItem(kind: "dish" | "shaak" | "rest") {
    setEditItem({ kind, id: null });
    setEditItemOrigin("kitchen");
    setActive("editItem");
  }
  function openEditTheme(id: string) {
    setEditTheme({ id });
    setActive("editTheme");
  }
  function openOverridesSheet(weekday: number, meal: Meal) {
    setOverrides({ weekday, meal });
    setActive("overrides");
  }
  // "Pick…"/"Change" inside the roster sheet — opens the real MealPicker aimed at one
  // person. `overrides` is left set so `onReturnToRoster` below can re-show the same
  // roster sheet once the pick is saved, per tasks/step-08.md §08b: "returns to the
  // roster sheet, not to the board — you are usually setting more than one."
  function openPersonPicker(weekday: number, meal: Meal, forPerson: PersonId) {
    setPicker({ weekday, meal, forPerson });
    setActive("picker");
  }
  function returnToRoster() {
    setActive("overrides");
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
                  onOpenOverrides={openOverridesSheet}
                />
              );
            })}
          </main>

          <KitchenPanel week={week} onEdit={openKitchenEditItem} onNew={openKitchenNewItem} onToast={showToast} />

          <MealPicker
            open={active === "picker"}
            weekday={picker?.weekday ?? 0}
            meal={picker?.meal ?? "dinner"}
            forPerson={picker?.forPerson ?? null}
            weekStart={weekStart}
            week={week}
            onClose={closeSheets}
            onReturnToRoster={returnToRoster}
            onEditItem={openEditItem}
          />
          <OverridesSheet
            open={active === "overrides"}
            weekday={overrides?.weekday ?? 0}
            meal={overrides?.meal ?? "dinner"}
            weekStart={weekStart}
            week={week}
            onClose={closeSheets}
            onPick={(personId) => openPersonPicker(overrides?.weekday ?? 0, overrides?.meal ?? "dinner", personId)}
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
            onDone={() => setActive(editItemOrigin === "kitchen" ? null : "picker")}
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
