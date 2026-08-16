import { useEffect, useRef, useState } from "react";

/**
 * Holds the current toast message and the "show it, then auto-dismiss" behaviour.
 * Ported VERBATIM from `Main/thali-mockup.html`'s `toast()` (lines ~1525-1529): showing a
 * new message clears any pending dismiss timer and starts a fresh 5200ms one. The page that
 * assembles the board owns *when* to call `showToast` — this hook only owns the timing.
 */
export interface UseToastResult {
  message: string | null;
  showToast(msg: string): void;
}

const DISMISS_MS = 5200;

export function useToast(): UseToastResult {
  const [message, setMessage] = useState<string | null>(null);
  const dismissTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (dismissTimer.current !== null) {
        window.clearTimeout(dismissTimer.current);
      }
    };
  }, []);

  function showToast(msg: string) {
    if (dismissTimer.current !== null) {
      window.clearTimeout(dismissTimer.current);
    }
    setMessage(msg);
    dismissTimer.current = window.setTimeout(() => {
      dismissTimer.current = null;
      setMessage(null);
    }, DISMISS_MS);
  }

  return { message, showToast };
}
