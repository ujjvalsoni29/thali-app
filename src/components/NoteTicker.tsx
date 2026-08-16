import { useEffect, useState } from "react";
import type { ReactElement } from "react";

/**
 * The rotating instructional note strip. Ported VERBATIM from `Main/thali-mockup.html`'s
 * `NOTES` array (lines ~710-721) and `rotateNote()` (lines ~1761-1762, `setInterval` every
 * 8000ms) — plan §1a: mockup first, then the app. Several entries contain inline `<b>` tags;
 * these are trusted, hardcoded, app-authored strings with no user input, so rendering them
 * via `dangerouslySetInnerHTML` (as the mockup does with `innerHTML`) is the same shape the
 * mockup already shipped, with no equivalent-safety alternative that preserves the inline
 * bold without a whole markdown parser for ten static strings.
 */
const NOTES: readonly string[] = [
  "Click any slot to pick a meal — the picker tells you when you last ate it.",
  "In <b>The Kitchen</b> drag a dish from one theme to another. Drag a shaak between <b>Wants a dal</b> and <b>Stands alone</b> to fix the pairing.",
  "Everyone eats the plan unless you say so — hit <b>+ someone else</b>, then pick from the same list.",
  "Lunch: pick the format first. <b>Rotli · Shaak · Dal · Bhaat</b> only offers shaaks that want a dal.",
  "<b>Surprise me</b> only picks things nobody has eaten in two weeks, and stays inside each night’s theme.",
  "Restaurants file two ways — your own groups, and when you’d go (<b>Occasion</b> is one of them).",
  "Out of ideas? The <b>idea bank</b> has 220 vegetarian dinners and 24 theme ideas.",
  "Done picking? <b>Share the week</b> makes a printable sheet for the family group — or copies it as text for WhatsApp.",
  "The pencil on any row edits that dish or theme without leaving the popup.",
  "Nothing is ever deleted, only archived. Past weeks keep the meals they had.",
];

const ROTATE_MS = 8000;

export function NoteTicker(): ReactElement {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % NOTES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="note">
      <span className="pin" />
      <span className="t" key={index} dangerouslySetInnerHTML={{ __html: NOTES[index] }} />
    </div>
  );
}
