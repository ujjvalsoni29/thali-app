import type { ReactElement } from "react";
import "../theme/toast.css";

/**
 * The bottom-of-screen toast pill. Ported VERBATIM from `Main/thali-mockup.html`'s `.toast`
 * markup and `toast()` function (lines ~371-376, ~1525-1529) — plan §1a: mockup first, then
 * the app. `useToast` owns the show/auto-dismiss timing; this component just renders
 * whatever `message` it's given, `null` meaning hidden.
 *
 * Also the single import point for `theme/toast.css`, which covers `.note`, `.toast`,
 * `.confetti`/`.cf` and the `fall`/`pop` keyframes — NoteTicker, Toast and Confetti are
 * always mounted together by the page that assembles them.
 */
export interface ToastProps {
  message: string | null;
}

export function Toast(props: ToastProps): ReactElement {
  const { message } = props;
  return <div className={"toast" + (message ? " on" : "")}>{message}</div>;
}
