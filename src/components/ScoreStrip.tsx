import { useEffect, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import type { WeekTally } from "../lib/tally";
import "../theme/scores.css";

/**
 * The week board's score strip — a ring meter for "meals decided" plus four count-up
 * tallies. Ported VERBATIM from `Main/thali-mockup.html` (score-strip CSS ~lines 134-155,
 * markup ~lines 525-544, `renderScores()`'s DOM/animation half and `countUp()`
 * ~lines 919-949) — plan §1a: mockup first, then the app, no re-derivation. The counting
 * math itself lives in `src/lib/tally.ts`, not here — this component only renders a
 * `WeekTally` and owns the count-up animation.
 */
export interface ScoreStripProps {
  tally: WeekTally;
}

/** A ring's circumference for r=24, matching the mockup's `meterfg`/`bg`/`rim` circles. */
const METER_C = 2 * Math.PI * 24;

const COUNT_UP_MS = 520;

/**
 * Ports the mockup's `countUp(node, to)` — an ease-out cubic over ~520ms via
 * `requestAnimationFrame` — as a hook returning the currently-displayed value. Respects
 * `prefers-reduced-motion` by jumping straight to `target`: base.css's global rule zeroes
 * CSS transition/animation durations, but this animation is driven by JS `rAF`, which that
 * rule can't reach.
 */
function useCountUp(target: number): number {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setDisplay(target);
      return;
    }

    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / COUNT_UP_MS);
      setDisplay(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return display;
}

interface CountBoxProps {
  sc: string;
  k: string;
  value: number;
  n: string;
}

function CountBox(props: CountBoxProps): ReactElement {
  const { sc, k, value, n } = props;
  const shown = useCountUp(value);
  return (
    <div className="score" style={{ "--sc": sc } as CSSProperties}>
      <div className="k">{k}</div>
      <div className="v">{shown}</div>
      <div className="n">{n}</div>
    </div>
  );
}

export function ScoreStrip(props: ScoreStripProps): ReactElement {
  const { tally } = props;
  const fraction = tally.filled / 14;
  const dashoffset = METER_C * (1 - fraction);
  const pct = Math.round(fraction * 100);

  return (
    <section className="scores">
      <div className="score prog" style={{ "--sc": "var(--pink)" } as CSSProperties}>
        <div className="meter">
          <svg width="62" height="62">
            <circle className="bg" cx="31" cy="31" r="24" />
            <circle
              className="fg"
              cx="31"
              cy="31"
              r="24"
              strokeDasharray={METER_C}
              strokeDashoffset={dashoffset}
            />
            <circle className="rim" cx="31" cy="31" r="29.2" />
          </svg>
          <div className="t">{pct}%</div>
        </div>
        <div>
          <div className="k">This week</div>
          <div className="v">{tally.filled}/14</div>
          <div className="n">meals decided</div>
        </div>
      </div>

      <CountBox sc="var(--marigold)" k="Nights off" value={tally.off} n="nobody cooks" />
      <CountBox sc="var(--grape)" k="First timers" value={tally.firsts} n="never made before" />
      <CountBox sc="var(--brick)" k="Repeats" value={tally.reps} n="eaten within 3 weeks" />
      <CountBox sc="var(--teal)" k="Custom plates" value={tally.ovs} n="someone eating differently" />
    </section>
  );
}
