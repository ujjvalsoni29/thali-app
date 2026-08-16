import { ApiError } from "./http";
import type { Env } from "./env";

/**
 * Thali runs LOCAL-ONLY (plan §B). `npm run dev` is on Manc's own machine, there is no
 * Cloudflare Access in front of it, and none is needed — the server never leaves his
 * network. Unlike Maximus, Thali has never designed an auth story for a hosted mode at
 * all (no login UI, no session table, no password — plan §B), so there is no header to
 * check for one.
 *
 * This gate is therefore **insurance, not an active control**: it costs nothing to keep,
 * and it means that if Thali is ever pointed at a real Cloudflare account, `/api/*` fails
 * closed on day one — refusing every request — instead of quietly serving the family's
 * meal plan to the open internet while nobody notices there was never an auth story.
 *
 * The mode comes from the explicit `DEPLOY_MODE` var in wrangler.jsonc, NEVER sniffed
 * from the hostname. Hostname sniffing looks fine and is wrong: `vite dev --host` — how
 * Manc would open this on a phone in the kitchen — serves on a LAN IP like 192.168.1.x,
 * which is neither `localhost` nor `127.0.0.1`, so every /api/* call would fail
 * UNAUTHORIZED with no obvious cause. That path is more likely here than it ever was on
 * Maximus (step-02 §2b), so treat this as load-bearing, not decorative.
 */
export function requireAccess(_request: Request, env: Env): void {
  if (env.DEPLOY_MODE === "local") return;

  throw new ApiError("UNAUTHORIZED", 'Thali has no hosted auth implemented — DEPLOY_MODE must be "local".');
}
