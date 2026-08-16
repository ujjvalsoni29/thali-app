import { useDarkMode } from "../lib/useDarkMode";
import "../theme/boot.css";

/**
 * Placeholder route. There is no board yet — that's step 06, "ported from the mockup,
 * not re-designed" (Thali_Tracker.md). This page exists only to prove the shell boots:
 * the Worker serves the SPA, `/api/health` answers, and the tokens + dark toggle work.
 */
export function Home() {
  const [mode, toggle] = useDarkMode();

  return (
    <div className="shell boot">
      <div className="brandline">
        <span className="wm">Thali</span>
        <span className="guj">થાળી</span>
      </div>
      <p className="boot-note">
        The week board and its pickers land in steps 06–08. This is the repo skeleton from
        step 02 — Vite + React 19 + a Cloudflare Worker with a D1 binding, running local-only.
      </p>
      <p className="boot-status">
        Dark mode is currently <b>{mode}</b> — the only thing this page persists to{" "}
        <code>localStorage</code>.
      </p>
      <div className="toggle-row">
        <button type="button" className="sticker" onClick={toggle}>
          {mode === "dark" ? "Switch to light" : "Switch to dark"}
        </button>
      </div>
    </div>
  );
}
