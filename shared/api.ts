/**
 * The API contract, shared by the Worker and the React app.
 *
 * Every endpoint is POST with a JSON body; every response is exactly one of the two
 * envelope shapes below (Thali_Master.md § API). Seventeen routes plus the bodyless
 * `/api/health`; every one of the seventeen is stubbed in `worker/routes/*.ts` and
 * returns `NOT_IMPLEMENTED` until step 04 fills it in.
 *
 * Domain wire types (the request/response shape of each route) are NOT written yet —
 * they land in step 04 alongside the zod `.strict()` schemas that validate them and the
 * D1 row shapes from step 03. Inventing them here ahead of the schema would just be a
 * second place for them to drift from the Master's data model.
 */

export type ErrorCode = "BAD_INPUT" | "NOT_FOUND" | "UNAUTHORIZED" | "NOT_IMPLEMENTED" | "INTERNAL";

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } };
