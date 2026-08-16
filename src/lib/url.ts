/**
 * "www.google.com" has no scheme, so the browser resolves it against the current directory and
 * opens nothing. Normalise on the way in.
 */
export function normUrl(u: string | null | undefined): string | undefined {
  const s = (u || "").trim();
  if (!s) return undefined;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : "https://" + s.replace(/^\/+/, "");
}
