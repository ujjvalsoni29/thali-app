import type { ApiResponse, ErrorCode } from "../../shared/api";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" } as const;

/** HTTP status is informational — clients read `ok`, not the status code (Thali_Master.md § API). */
const STATUS: Record<ErrorCode, number> = {
  BAD_INPUT: 400,
  UNAUTHORIZED: 403,
  NOT_FOUND: 404,
  NOT_IMPLEMENTED: 501,
  INTERNAL: 500,
};

export function ok<T>(data: T): Response {
  const body: ApiResponse<T> = { ok: true, data };
  return new Response(JSON.stringify(body), { status: 200, headers: JSON_HEADERS });
}

export function fail(code: ErrorCode, message: string): Response {
  const body: ApiResponse<never> = { ok: false, error: { code, message } };
  return new Response(JSON.stringify(body), { status: STATUS[code], headers: JSON_HEADERS });
}

/** Every route stub in `worker/routes/` returns this until step 04 fills it in — declaring
 *  the route table now means step 04 never has to touch `worker/index.ts` (step-02 §1). */
export function notImplemented(route: string): Response {
  return fail("NOT_IMPLEMENTED", `${route} is stubbed — step 04 fills it in.`);
}

/** A malformed body is BAD_INPUT, never a 500. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError("BAD_INPUT", "Request body must be valid JSON.");
  }
}

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
