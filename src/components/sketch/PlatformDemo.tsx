'use client';

/**
 * PlatformDemo — coded annotation layer over a real platform screenshot.
 *
 * Same engine philosophy as SketchExplainer (dependency-free, scoped CSS,
 * self-drawing strokes, in-view gating, reduced-motion, loop-by-remount), but
 * instead of an abstract scene it draws highlight rings, arrows, callouts and a
 * cursor ON TOP of a screenshot <img>. Use it to teach real UI: "here's the
 * box, here's the mic, paste a link here, your drafts land there."
 *
 * Authoring is pure config. The SVG overlay shares the screenshot's natural
 * pixel size as its viewBox, so every annotation coordinate is just the pixel
 * on the image — read it straight off the screenshot, no scaling math. Swap the
 * `src` and the `steps` array; no new JSX per demo.
 *
 * Screenshots go stale when the UI changes. Treat `src` as a regen artifact:
 * recapture at the same viewport when the surface moves. Capture at 2x and pass
 * the *CSS* (1x) pixel dimensions as width/height so coordinates stay sane.
 *
 * Honesty note: only annotate capabilities that are actually shipped. This
 * component makes claims look official — keep the claims true.
 */

import { useEffect, useId, useRef, useState } from 'react';

const DEFAULT_PERIOD_MS = 9000;

/**
 * One annotation, positioned in screenshot pixel coordinates. `at` is the
 * start delay in seconds from the top of each loop. Order in the array does not
 * matter; `at` controls timing.
 */
export type DemoAnnotation =
  /** Highlight rectangle around a UI affordance. */
  | { kind: 'ring'; x: number; y: number; w: number; h: number; rx?: number; at: number }
  /** Pulsing marker dot (e.g. "click here"). */
  | { kind: 'dot'; x: number; y: number; r?: number; at: number }
  /** Directional arrow from (x1,y1) to (x2,y2). */
  | { kind: 'arrow'; x1: number; y1: number; x2: number; y2: number; at: number }
  /** Callout pill. `tone` colors it: `do` = action (accent), `get` = payoff (dark). */
  | { kind: 'label'; x: number; y: number; text: string; sub?: string; tone?: 'do' | 'get'; w?: number; at: number }
  /** Cursor pointer glyph at a point. */
  | { kind: 'cursor'; x: number; y: number; at: number };

interface OverlayProps {
  width: number;
  height: number;
  steps: DemoAnnotation[];
  accent: string;
  scope: string;
  paused: boolean;
}

/** CSS for one overlay instance, scoped to `.${scope}`. */
function overlayCss(scope: string, accent: string): string {
  return `
.${scope} { display: block; overflow: visible; position: absolute; inset: 0; width: 100%; height: 100%; }
.${scope} .stroke {
  fill: none;
  stroke: ${accent};
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw-${scope} 0.5s ease forwards;
  animation-delay: var(--d, 0s);
}
.${scope} .ring { stroke-width: 3.5; }
.${scope} .arrow { stroke-width: 5; }
.${scope} .dot { fill: ${accent}; opacity: 0; animation: pop-${scope} 0.35s ease forwards; animation-delay: var(--d, 0s); }
.${scope} .pulse {
  fill: none; stroke: ${accent}; stroke-width: 2; opacity: 0;
  transform-box: fill-box; transform-origin: center;
  animation: pulse-${scope} 1.4s ease-out infinite;
  animation-delay: var(--d, 0s);
}
.${scope} .cursor { fill: #111827; stroke: #ffffff; stroke-width: 1.5; opacity: 0; animation: pop-${scope} 0.3s ease forwards; animation-delay: var(--d, 0s); }
.${scope} .cap-chip {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
  width: fit-content;
  max-width: 100%;
  padding: 8px 12px;
  border-radius: 11px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #ffffff;
  box-shadow: 0 6px 18px rgba(0,0,0,0.28);
  opacity: 0;
  transform: translateY(10px) scale(0.96);
  transform-origin: left center;
  animation: rise-${scope} 0.42s cubic-bezier(0.16,1,0.3,1) forwards;
  animation-delay: var(--d, 0s);
}
.${scope} .cap-chip.do { background: #F59E0B; color: #1a1205; }
.${scope} .cap-chip.get { background: #059669; color: #ffffff; }
/* Pulsing reward ring on the payoff pill — pseudo-element so it never fights the rise-in. */
.${scope} .cap-chip.get::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 13px;
  box-shadow: 0 0 0 0 rgba(16,185,129,0.6);
  animation: glow-${scope} 1.9s ease-out 0.7s infinite;
}
.${scope} .cap-main { font-size: 15px; font-weight: 650; line-height: 1.25; letter-spacing: -0.1px; }
.${scope} .cap-sub { font-size: 12.5px; font-weight: 450; line-height: 1.3; opacity: 0.9; }
.${scope} .cap-key { font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; }
@keyframes draw-${scope} { to { stroke-dashoffset: 0; } }
@keyframes rise-${scope} { to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes pop-${scope} { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
@keyframes pulse-${scope} { 0% { opacity: 0.55; transform: scale(0.8); } 100% { opacity: 0; transform: scale(2.2); } }
@keyframes glow-${scope} { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.55); } 70% { box-shadow: 0 0 0 8px rgba(16,185,129,0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }
.${scope}.paused .stroke { animation: none; stroke-dashoffset: 0; }
.${scope}.paused .cap-chip { animation: none; opacity: 1; transform: none; }
.${scope}.paused .cap-chip.get::after { animation: none; box-shadow: none; }
.${scope}.paused .dot, .${scope}.paused .cursor { animation: none; opacity: 1; transform: none; }
.${scope}.paused .pulse { animation: none; opacity: 0; }
`;
}

/** Two-segment arrowhead at (x2,y2) pointing along the shaft from (x1,y1). */
function arrowHead(x1: number, y1: number, x2: number, y2: number, len = 12): string {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const spread = 0.5; // radians off-axis
  const lx = x2 - len * Math.cos(ang - spread);
  const ly = y2 - len * Math.sin(ang - spread);
  const rx = x2 - len * Math.cos(ang + spread);
  const ry = y2 - len * Math.sin(ang + spread);
  return `M${lx} ${ly} L${x2} ${y2} L${rx} ${ry}`;
}

function d(at: number): React.CSSProperties {
  return { ['--d' as string]: `${at}s` };
}

function Overlay({ width, height, steps, accent, scope, paused }: OverlayProps) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={`${scope} ${paused ? 'paused' : ''}`}
      aria-hidden="true"
    >
      <style dangerouslySetInnerHTML={{ __html: overlayCss(scope, accent) }} />
      {steps.map((s, i) => {
        switch (s.kind) {
          case 'ring':
            return (
              <rect
                key={i}
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                rx={s.rx ?? 12}
                pathLength={1}
                className="stroke ring"
                style={d(s.at)}
              />
            );
          case 'dot':
            return (
              <g key={i}>
                <circle cx={s.x} cy={s.y} r={s.r ?? 7} className="dot" style={d(s.at)} />
                <circle cx={s.x} cy={s.y} r={s.r ?? 7} className="pulse" style={d(s.at)} />
              </g>
            );
          case 'arrow':
            return (
              <g key={i}>
                <path d={`M${s.x1} ${s.y1} L${s.x2} ${s.y2}`} pathLength={1} className="stroke arrow" style={d(s.at)} />
                <path d={arrowHead(s.x1, s.y1, s.x2, s.y2, 16)} pathLength={1} className="stroke arrow" style={d(s.at + 0.15)} />
              </g>
            );
          case 'label':
            return (
              <foreignObject key={i} x={s.x} y={s.y} width={s.w ?? 300} height={92} style={{ overflow: 'visible' }}>
                <div className={`cap-chip ${s.tone ?? 'do'}`} style={d(s.at)}>
                  <span className="cap-main">{s.text}</span>
                  {s.sub ? <span className="cap-sub">{s.sub}</span> : null}
                </div>
              </foreignObject>
            );
          case 'cursor':
            // Classic pointer glyph, tip at (x,y).
            return (
              <path
                key={i}
                d={`M${s.x} ${s.y} l0 18 l5 -5 l4 8 l3 -1.5 l-4 -8 l7 0 z`}
                className="cursor"
                style={d(s.at)}
              />
            );
          default:
            return null;
        }
      })}
    </svg>
  );
}

// ---- Wrapper: in-view gating + loop + reduced-motion ----------------------

export interface PlatformDemoProps {
  /** Screenshot natural pixel size. Annotation coords live in this space. */
  width: number;
  height: number;
  /** Screenshot URL. Omit to render a labelled placeholder (engine still runs). */
  src?: string;
  /** Alt text for the screenshot. */
  alt?: string;
  /** Annotation track, positioned in screenshot pixels. */
  steps: DemoAnnotation[];
  /** Loop length in ms. Set just past your last `at` so the beat lands before replay. */
  periodMs?: number;
  accent?: string;
  /** Optional spoken-summary line under the demo. */
  caption?: string;
  className?: string;
}

export function PlatformDemo({
  width,
  height,
  src,
  alt = '',
  steps,
  periodMs = DEFAULT_PERIOD_MS,
  accent = '#0077AA',
  caption,
  className,
}: PlatformDemoProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [cycle, setCycle] = useState(0);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);

  // useId() returns colons (":r1:"), illegal in CSS selectors. Strip.
  const rawId = useId();
  const scope = `pd${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !inView) return;
    const id = setInterval(() => setCycle((c) => c + 1), periodMs);
    return () => clearInterval(id);
  }, [reduced, inView, periodMs]);

  const paused = reduced || !inView;

  return (
    <div ref={ref} className={className}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${width} / ${height}`, borderRadius: 14, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f1f5f9' }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontFamily: 'system-ui', fontSize: 14 }}>
            screenshot goes here · {width}×{height}
          </div>
        )}
        <Overlay key={cycle} width={width} height={height} steps={steps} accent={accent} scope={scope} paused={paused} />
      </div>
      {caption ? (
        <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{caption}</p>
      ) : null}
    </div>
  );
}

export default PlatformDemo;
