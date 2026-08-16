import { useEffect, useState } from "react";

const STORAGE_KEY = "thali.mode";

type Mode = "light" | "dark";

function readInitialMode(): Mode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

/**
 * The light/dark toggle. **This is the only legal use of `localStorage` in this app** — it
 * is a display preference, not data (thali-app/CLAUDE.md §4, step-02 §4). Every other piece
 * of state lives in D1, because a plan five people read cannot live in one browser.
 *
 * Writes to `document.documentElement.dataset.mode`, which is what `html[data-mode="dark"]`
 * in `src/theme/tokens.css` selects on (ported verbatim from the mockup).
 */
export function useDarkMode(): [Mode, () => void] {
  const [mode, setMode] = useState<Mode>(readInitialMode);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const toggle = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  return [mode, toggle];
}
