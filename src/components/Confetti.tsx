import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import { INKS } from "../lib/roster";

/**
 * The confetti burst overlay. Ported VERBATIM from `Main/thali-mockup.html`'s `.confetti`/
 * `.cf` CSS and `confetti()` function (lines ~368-383, ~1531-1546) — plan §1a: mockup
 * first, then the app. Bursts when `burstKey` changes (never on mount — see `ConfettiProps`),
 * and only when the user hasn't asked for reduced motion; the mockup skips confetti entirely
 * in that case rather than substituting a fallback visual, so this component does the same.
 */
export interface ConfettiProps {
  burstKey: number;
}

interface Particle {
  id: number;
  left: number;
  background: string;
  dx: number;
  rot: number;
  delay: number;
}

const PARTICLE_COUNT = 64;
const LIFETIME_MS = 3100;

let nextParticleId = 0;

export function Confetti(props: ConfettiProps): ReactElement {
  const { burstKey } = props;
  const [particles, setParticles] = useState<readonly Particle[]>([]);
  // Captured once, at construction, from the prop's starting value — NOT mutated inside
  // the effect below. StrictMode double-invokes effects on mount in dev (mount, cleanup,
  // mount again); a flag toggled *inside* the effect body would flip to "seen" on the
  // first of those two mount invocations and then wrongly read as "not first" on the
  // second, firing a burst the very first time this component appears. Comparing the
  // live prop against a ref frozen at render time sidesteps that entirely.
  const initialBurstKey = useRef(burstKey);
  const removalTimers = useRef<number[]>([]);

  useEffect(() => {
    if (burstKey === initialBurstKey.current) return;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const burst: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      burst.push({
        id: nextParticleId++,
        left: 10 + Math.random() * 80,
        background: `var(${INKS[i % INKS.length]})`,
        dx: Math.random() * 240 - 120,
        rot: Math.random() * 880 - 440,
        delay: Math.random() * 0.45,
      });
    }
    setParticles((prev) => [...prev, ...burst]);

    const ids = burst.map((p) => p.id);
    const timer = window.setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !ids.includes(p.id)));
    }, LIFETIME_MS);
    removalTimers.current.push(timer);
  }, [burstKey]);

  useEffect(() => {
    return () => {
      for (const timer of removalTimers.current) {
        window.clearTimeout(timer);
      }
      removalTimers.current = [];
    };
  }, []);

  return (
    <div className="confetti">
      {particles.map((p) => (
        <span
          key={p.id}
          className="cf"
          style={
            {
              left: `${p.left}vw`,
              background: p.background,
              "--dx": `${p.dx}px`,
              "--rot": `${p.rot}deg`,
              animationDelay: `${p.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
