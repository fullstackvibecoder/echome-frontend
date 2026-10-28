'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link2, Pause, Play } from 'lucide-react';
import {
  LOOP_HOLD,
  LOOP_MS,
  PERSONAS,
  PHASE,
  WEEKDAYS,
  WEEK_PLAN,
  type Persona,
  type PersonaId,
} from './kitDemoData';

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
/** Slight overshoot so cards "snap" into place. */
const easeBack = (x: number) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);

const words = (text: string) => text.match(/\S+\s*/g) ?? [];

export type Stage = 'Recording' | 'Finding moments' | 'Building kit' | 'Scheduled';

/** Everything the demo shows at loop position t (0..1). Pure, so it's testable. */
export function deriveFrame(persona: Persona, rawT: number) {
  const t = Math.min(1, Math.max(0, rawT));
  const recordProgress = clamp(t / PHASE.recordEnd);
  const totalWords = persona.transcript.reduce((n, run) => n + words(run.text).length, 0);
  const revealed = Math.floor(recordProgress * totalWords);

  let cursor = 0;
  const runs = persona.transcript.map((run) => {
    const parts = words(run.text);
    const n = Math.max(0, Math.min(parts.length, revealed - cursor));
    cursor += parts.length;
    const highlight = run.highlight
      ? clamp((t - (PHASE.highlightStart + (run.highlight - 1) * PHASE.highlightStep)) / PHASE.highlightLength)
      : 0;
    return {
      shown: parts.slice(0, n).join(''),
      rest: parts.slice(n).join(''),
      clip: run.highlight,
      highlight,
    };
  });

  const clipLines = persona.transcript.filter((r) => r.highlight).map((r) => r.text.trim());
  const kit = [
    ...clipLines.map((body, i) => ({ kind: 'clip' as const, label: `Clip ${i + 1}`, short: `Clip ${i + 1}`, body })),
    ...persona.extras,
  ].map((item, i) => ({ ...item, appear: clamp((t - (PHASE.kitStart + i * PHASE.kitStep)) / PHASE.kitLength) }));

  const week = WEEKDAYS.map((day, d) => ({
    day,
    items: WEEK_PLAN.map((p, n) => ({ ...p, n }))
      .filter((p) => p.day === d)
      .map((p) => ({
        n: p.n,
        kind: kit[p.ref].short,
        when: `${persona.networks[p.n]}, ${p.time}`,
        appear: clamp((t - (PHASE.weekStart + p.n * PHASE.weekStep)) / PHASE.weekLength),
      })),
  }));

  const secs = Math.round(recordProgress * persona.source.seconds);
  const stage: Stage =
    t < PHASE.recordEnd ? 'Recording' : t < PHASE.kitStart ? 'Finding moments' : t < PHASE.weekStart ? 'Building kit' : 'Scheduled';

  return {
    runs,
    kit,
    week,
    stage,
    recording: t < PHASE.recordEnd,
    clock: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
  };
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia?.(REDUCED_MOTION);
  mq?.addEventListener?.('change', onChange);
  return () => mq?.removeEventListener?.('change', onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia?.(REDUCED_MOTION).matches ?? false,
    () => false,
  );
}

export function KitDemo() {
  const reducedMotion = usePrefersReducedMotion();
  const [personaId, setPersonaId] = useState<PersonaId>('coach');
  // Server render and first paint show the finished week, so the content never
  // depends on JS. The loop starts the first time the stage scrolls into view.
  const [t, setT] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [inView, setInView] = useState(false);
  const started = useRef(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0];
  const frame = deriveFrame(persona, t);

  // Only animate while the stage is on screen.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Reduced motion never autoplays: it stays on the finished week.
  useEffect(() => {
    if (!inView || started.current || reducedMotion) return;
    started.current = true;
    setT(0);
    setPlaying(true);
  }, [inView, reducedMotion]);

  useEffect(() => {
    if (!playing || !inView) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      setT((prev) => (prev + dt / LOOP_MS > LOOP_HOLD ? 0 : prev + dt / LOOP_MS));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, inView]);

  const pickPersona = useCallback(
    (id: PersonaId) => {
      started.current = true;
      setPersonaId(id);
      setT(reducedMotion ? 1 : 0);
      setPlaying(!reducedMotion);
    },
    [reducedMotion],
  );

  const togglePlay = () => {
    if (!playing && t >= 1) setT(0);
    setPlaying(!playing);
  };

  const fullTranscript = persona.transcript.map((r) => r.text).join('');
  const showVideo = !reducedMotion;

  return (
    <section id="demo" aria-label="Watch one recording become a week of content" className="mx-auto max-w-[1320px] px-4 sm:px-6 pb-24">
      <div ref={stageRef} className="flex flex-col gap-7 overflow-hidden rounded-[32px] bg-home-stage p-5 text-home-paper sm:p-7">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
          <div role="group" aria-label="Show an example for" className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-home-stage-raised p-1">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={p.id === personaId}
                onClick={() => pickPersona(p.id)}
                className={`min-h-11 flex-none cursor-pointer whitespace-nowrap rounded-full px-4 text-[15px] transition-colors ${
                  p.id === personaId ? 'bg-home-paper font-semibold text-home-stage' : 'font-medium text-home-paper hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex min-w-[260px] flex-[0_1_420px] items-center gap-3.5">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause demo' : 'Play demo'}
              className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full bg-home-paper text-home-stage"
            >
              {playing ? <Pause className="h-4 w-4" fill="currentColor" aria-hidden="true" /> : <Play className="h-4 w-4" fill="currentColor" aria-hidden="true" />}
            </button>
            <label htmlFor="kit-demo-scrub" className="sr-only">
              Scrub the demo
            </label>
            <input
              id="kit-demo-scrub"
              type="range"
              min={0}
              max={1000}
              value={Math.round(Math.min(1, t) * 1000)}
              onChange={(e) => {
                setPlaying(false);
                setT(Number(e.target.value) / 1000);
              }}
              className="h-11 min-w-0 flex-1 accent-home-signal"
            />
            <span className="w-[132px] flex-none text-right font-grotesk text-[15px] tabular-nums text-home-stage-muted">{frame.stage}</span>
          </div>
        </div>

        {/* Source + live captions */}
        <div className="flex flex-wrap items-center gap-x-10 gap-y-5 sm:gap-y-7">
          {/* Phones: a compact source bar instead of the phone frame */}
          <div className="flex w-full items-center gap-3 rounded-2xl bg-home-stage-raised px-4 py-3 sm:hidden">
            <span aria-hidden="true" className={`h-2.5 w-2.5 flex-none rounded-full ${frame.recording ? 'bg-red-500' : 'bg-[#5A5E68]'}`} />
            <span className="flex-none font-grotesk text-lg font-semibold tabular-nums">{frame.clock}</span>
            <span className="min-w-0 truncate text-sm text-home-stage-muted">
              {persona.source.type === 'link' ? persona.source.link : persona.source.where}
            </span>
          </div>
          <div className="hidden h-[440px] w-[220px] flex-none rounded-[40px] bg-black p-2.5 shadow-[inset_0_0_0_2px_#2A2D35] sm:block">
            <div className="flex h-full flex-col items-center justify-between rounded-[31px] bg-home-stage-raised px-4 pb-6 pt-7">
              <div className="flex items-center gap-2 font-grotesk text-lg font-semibold tabular-nums">
                <span
                  aria-hidden="true"
                  className={`inline-block h-2.5 w-2.5 rounded-full ${frame.recording ? 'bg-red-500' : 'bg-[#5A5E68]'}`}
                />
                {frame.clock}
              </div>
              {persona.source.type === 'link' && (
                <div className="flex w-full flex-col gap-2 rounded-xl bg-home-stage p-3">
                  <span className="flex items-center gap-1.5 text-xs text-home-stage-muted">
                    <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Pasted link
                  </span>
                  <span className="break-all text-sm">{persona.source.link}</span>
                </div>
              )}
              <div className="flex h-[72px] items-center gap-[3px]" aria-hidden="true">
                {Array.from({ length: 18 }, (_, i) => (
                  <span
                    key={i}
                    className="block w-1 rounded bg-home-paper"
                    style={{ height: `${Math.round(8 + (frame.recording ? Math.abs(Math.sin(t * 40 + i * 0.9)) : 0.15) * 56)}px` }}
                  />
                ))}
              </div>
              <span className="text-center text-[13px] text-home-stage-muted">{persona.source.where}</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3.5">
            <span className="text-sm text-home-stage-muted">
              {frame.recording ? 'Live captions' : 'Echo is picking the moments worth posting'}
            </span>
            <p className="sr-only">{fullTranscript}</p>
            <p aria-hidden="true" className="m-0 font-grotesk text-[clamp(26px,3.4vw,50px)] font-semibold leading-[1.12] tracking-[-0.025em]">
              {frame.runs.map((run, i) => (
                <span key={i}>
                  <span
                    className={run.clip ? 'rounded px-0.5 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]' : undefined}
                    style={
                      run.clip
                        ? {
                            color: run.highlight > 0 ? '#0E0F13' : undefined,
                            backgroundImage: 'linear-gradient(#22D3EE, #22D3EE)',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: `${Math.round(run.highlight * 100)}% 100%`,
                          }
                        : { color: frame.recording ? undefined : '#8A8F9B' }
                    }
                  >
                    {run.shown}
                  </span>
                  <span className="text-transparent">{run.rest}</span>
                  {run.clip > 0 && run.highlight >= 1 && (
                    <span className="mx-2 inline-block rounded-full bg-home-paper px-2 py-0.5 align-middle font-sans text-[13px] font-semibold tracking-normal text-home-stage">
                      Clip {run.clip}
                    </span>
                  )}
                </span>
              ))}
            </p>
          </div>
        </div>

        {/* The kit */}
        <ul aria-label="Your kit" className="m-0 flex list-none items-end gap-4 overflow-x-auto p-0 pb-2 sm:flex-wrap sm:overflow-visible">
          {frame.kit.map((item, i) => {
            const a = item.appear;
            const motion = {
              opacity: easeOut(a),
              transform: `translateY(${Math.round((1 - easeOut(a)) * 60)}px) scale(${(0.6 + 0.4 * easeBack(a)).toFixed(3)})`,
              transformOrigin: '50% 100%',
            };
            if (item.kind === 'clip') {
              const media = persona.clipMedia?.[i];
              return (
                <li key={`${persona.id}-${i}`} style={motion} className="relative flex h-[266px] w-[150px] flex-none flex-col justify-between overflow-hidden rounded-[18px] bg-gradient-to-b from-[#2A2D35] to-[#15161B] p-3">
                  {media &&
                    (showVideo && a > 0 ? (
                      <video
                        className="absolute inset-0 h-full w-full object-cover"
                        src={media.video}
                        poster={media.poster}
                        autoPlay
                        muted
                        loop
                        playsInline
                        aria-hidden="true"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="absolute inset-0 h-full w-full object-cover" src={media.poster} alt="" />
                    ))}
                  {media && <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-black/80" />}
                  <span className="relative self-start rounded-md bg-black/55 px-2 py-1 text-xs font-semibold">{item.label}</span>
                  <span className="relative font-grotesk text-[17px] font-bold leading-[1.15] [text-shadow:0_2px_0_#000,0_0_12px_rgba(0,0,0,0.8)]">
                    {item.body}
                  </span>
                </li>
              );
            }
            const look =
              item.kind === 'carousel'
                ? 'h-[220px] w-[220px] rounded-[10px] bg-home-paper text-home-ink shadow-[8px_-8px_0_#3A3D46,16px_-16px_0_#262830] text-2xl font-bold leading-[1.05]'
                : i % 2
                  ? 'h-[180px] w-[280px] rounded bg-home-paper text-home-ink text-[21px] font-semibold leading-[1.2]'
                  : 'h-[180px] w-[280px] rounded bg-home-signal text-home-ink text-[21px] font-semibold leading-[1.2]';
            return (
              <li key={`${persona.id}-${i}`} style={motion} className={`flex flex-none flex-col justify-between p-3 ${look}`}>
                <span className="self-start rounded-md bg-black/55 px-2 py-1 font-sans text-xs font-semibold text-home-paper">{item.label}</span>
                <span className="font-grotesk tracking-[-0.01em]">{item.body}</span>
              </li>
            );
          })}
        </ul>

        {/* The week */}
        <div className="overflow-x-auto">
          <ol aria-label="Scheduled week" className="m-0 grid min-w-[700px] list-none grid-cols-7 gap-1.5 p-0">
            {frame.week.map((d) => (
              <li key={d.day} className="flex min-h-[120px] flex-col gap-2 rounded-[14px] bg-home-stage-raised px-2.5 py-3">
                <span className="font-grotesk text-lg font-bold">{d.day}</span>
                {d.items.map((it) => (
                  <div
                    key={it.n}
                    className="flex flex-col gap-0.5 rounded-lg bg-home-signal p-2 text-xs leading-[1.3] text-home-stage"
                    style={{ opacity: easeOut(it.appear), transform: `translateY(${Math.round((1 - easeOut(it.appear)) * -40)}px)` }}
                  >
                    <span className="font-semibold">{it.kind}</span>
                    <span>{it.when}</span>
                  </div>
                ))}
              </li>
            ))}
          </ol>
        </div>

        <p className="m-0 text-[13px] leading-normal text-home-stage-muted">{persona.note}</p>
      </div>
    </section>
  );
}
