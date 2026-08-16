import { Navigate, Route, Routes } from "react-router";
import { Week } from "./pages/Week";
import { iso, mondayOf } from "./lib/weeks";

/**
 * The week board lives at `/week/:weekStart` — a Monday-keyed ISO date, so a week is
 * linkable and the back button works (step-06 §2a, the one deliberate upgrade over the
 * mockup, which kept the current week in a JS variable instead of the URL). `/` redirects
 * to the real current week rather than being its own route, so there is exactly one URL
 * shape for "the board" and nothing to keep in sync between two of them.
 *
 * The pickers (step 07), the overrides sheet (step 08) and The Kitchen (step 09) are sheets
 * layered over this same page, not separate routes — they don't add entries here.
 */
export function App() {
  const currentWeekStart = iso(mondayOf(new Date()));

  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/week/${currentWeekStart}`} replace />} />
      <Route path="/week/:weekStart" element={<Week />} />
    </Routes>
  );
}
