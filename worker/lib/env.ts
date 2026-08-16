export interface Env {
  /** Cloudflare D1 — managed SQLite. Locally this is a file under `.wrangler/state/`. */
  DB: D1Database;
  /** The built SPA, served by the Workers static-assets binding. */
  ASSETS: Fetcher;
  /**
   * "local" — no auth gate; Thali is running on Manc's own machine (the only mode today,
   *   and the only one this project has ever planned for — plan §B).
   * "hosted" — reserved. Thali has no auth story for it, so the gate fails closed rather
   *   than serving the family's plan to the open internet.
   * Set in wrangler.jsonc `vars`, never sniffed from the request.
   */
  DEPLOY_MODE: "local" | "hosted";
}
