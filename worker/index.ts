import type { Env } from "./lib/env";
import { ApiError, fail, ok, readJson } from "./lib/http";
import { requireAccess } from "./lib/access";
import { clearWeek, getWeek } from "./routes/week";
import { clearSlot, setSlot } from "./routes/slot";
import { clearOverride, setOverride } from "./routes/override";
import { setWeekdayTheme } from "./routes/weekday";
import { archiveDish, createDish, moveDishTheme, updateDish } from "./routes/dish";
import { archiveRestaurant, createRestaurant, updateRestaurant } from "./routes/restaurant";
import { createTheme, deleteTheme, updateTheme } from "./routes/theme";

/**
 * The whole backend. One Worker: `/api/*` is handled here, everything else falls through
 * to the static-assets binding (the built React SPA).
 *
 * Every route is POST with a JSON body and answers with the `{ok,data}` / `{ok,error}`
 * envelope (Thali_Master.md § API). No router library — seventeen POSTs do not need one.
 *
 * All seventeen routes are declared here as a fixed table, each pointing at a stub in
 * `worker/routes/*.ts` that currently returns NOT_IMPLEMENTED. Step 04 fills in those
 * stubs; it never has to touch this file (step-02 §2b).
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    try {
      // Every /api/* route is POST. A GET here is a caller bug, not a route to add.
      if (request.method !== "POST") {
        return fail("BAD_INPUT", "Every Thali endpoint is POST with a JSON body.");
      }

      requireAccess(request, env);

      // /api/health takes no body, so it is handled before the JSON reader — a bodyless
      // POST is fine for it.
      if (url.pathname === "/api/health") {
        const row = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
        return ok({ db: row?.ok === 1 ? 1 : 0 });
      }

      const body = await readJson(request);

      switch (url.pathname) {
        case "/api/week/get":
          return await getWeek(env, body);
        case "/api/week/clear":
          return await clearWeek(env, body);

        case "/api/slot/set":
          return await setSlot(env, body);
        case "/api/slot/clear":
          return await clearSlot(env, body);

        case "/api/override/set":
          return await setOverride(env, body);
        case "/api/override/clear":
          return await clearOverride(env, body);

        case "/api/weekday/theme/set":
          return await setWeekdayTheme(env, body);

        case "/api/dish/create":
          return await createDish(env, body);
        case "/api/dish/update":
          return await updateDish(env, body);
        case "/api/dish/themes/move":
          return await moveDishTheme(env, body);
        case "/api/dish/archive":
          return await archiveDish(env, body);

        case "/api/restaurant/create":
          return await createRestaurant(env, body);
        case "/api/restaurant/update":
          return await updateRestaurant(env, body);
        case "/api/restaurant/archive":
          return await archiveRestaurant(env, body);

        case "/api/theme/create":
          return await createTheme(env, body);
        case "/api/theme/update":
          return await updateTheme(env, body);
        case "/api/theme/delete":
          return await deleteTheme(env, body);

        default:
          return fail("NOT_FOUND", `No such endpoint: ${url.pathname}`);
      }
    } catch (error) {
      if (error instanceof ApiError) return fail(error.code, error.message);
      console.error(error);
      return fail("INTERNAL", "Unexpected error.");
    }
  },
} satisfies ExportedHandler<Env>;
