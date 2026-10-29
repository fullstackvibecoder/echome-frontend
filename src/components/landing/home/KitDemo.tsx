'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { Link2, Pause, Play } from 'lucide-react';
import { DEMO, LOOP_HOLD, LOOP_MS, PHASE, WEEK_PLAN, type KitExtra, type Media, type Persona } from './kitDemoData';

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** 1226 -> "20:26" */
export const mmss = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.round(secs) % 60).padStart(2, '0')}`;

/** The longest clip Echo makes; the length bar is drawn against this. */
const MAX_CLIP_SECS = 90;
const WAVE_BARS = 120;
/** Deterministic "waveform", so server and client render the same bars. */
const WAVE = Array.from({ length: WAVE_BARS }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.37)));

export type Stage = 'Recording' | 'Importing' | 'Finding clips' | 'Building kit' | 'Scheduling' | 'Scheduled';

type KitItem =
  | { kind: 'clip'; label: string; short: string; body: string; secs: number; media?: Media }
  | (KitExtra & { secs?: undefined; media?: undefined });

/** Everything the demo shows at loop position t (0..1). Pure, so it's testable. */
export function deriveFrame(persona: Persona, rawT: number) {
  const t = Math.min(1, Math.max(0, rawT));
  const playhead = clamp(t / PHASE.recordEnd);
  const playSecs = playhead * persona.source.seconds;

  const items: KitItem[] = [
    ...persona.clips.map((c, i) => ({
      kind: 'clip' as const,
      label: `Clip ${i + 1}`,
      short: `Clip ${i + 1}`,
      body: c.opening,
      secs: Math.round(c.end - c.start),
      media: c.media,
    })),
    ...persona.extras,
  ];
  // `fly`: bracket (or source) -> kit slot. `drop`: kit slot -> its day.
  const kit = items.map((item, i) => {
    const n = WEEK_PLAN.findIndex((p) => p.ref === i);
    return {
      ...item,
      fly: clamp((t - (PHASE.kitStart + i * PHASE.kitStep)) / PHASE.kitLength),
      drop: clamp((t - (PHASE.weekStart + n * PHASE.weekStep)) / PHASE.weekLength),
    };
  });

  const brackets = persona.clips.map((c, i) => ({
    left: c.start / persona.source.seconds,
    width: (c.end - c.start) / persona.source.seconds,
    secs: Math.round(c.end - c.start),
    draw: clamp((t - (PHASE.bracketStart + i * PHASE.bracketStep)) / PHASE.bracketLength),
  }));

  // The clip Echo is looking at right now, while it brackets.
  const bracketing = t >= PHASE.bracketStart && t < PHASE.kitStart;
  const focus = bracketing
    ? Math.min(persona.clips.length - 1, Math.floor((t - PHASE.bracketStart) / PHASE.bracketStep))
    : -1;
  // While recording, captions show the clip the playhead last passed.
  const live = persona.clips.reduce((last, c, i) => (c.start <= playSecs ? i : last), -1);

  const week = WEEK_PLAN.map((p, n) => ({
    day: p.day,
    ref: p.ref,
    when: `${persona.networks[n]}, ${p.time}`,
    landed: kit[p.ref].drop >= 1,
  }));

  const lastLanding = PHASE.weekStart + (WEEK_PLAN.length - 1) * PHASE.weekStep + PHASE.weekLength;
  const stage: Stage =
    t < PHASE.recordEnd
      ? persona.source.type === 'link'
        ? 'Importing'
        : 'Recording'
      : t < PHASE.kitStart
        ? 'Finding clips'
        : t < PHASE.weekStart
          ? 'Building kit'
          : t < lastLanding
            ? 'Scheduling'
            : 'Scheduled';

  // Which layer the right-hand panel shows.
  const panel: 'live' | 'bracket' | 'kit' | 'summary' =
    t < PHASE.bracketStart ? 'live' : bracketing ? 'bracket' : t < lastLanding - 0.02 ? 'kit' : 'summary';

  return {
    playhead,
    clock: mmss(playSecs),
    recording: t < PHASE.recordEnd,
    brackets,
    focus,
    focusDraw: focus >= 0 ? brackets[focus].draw : 0,
    live,
    kit,
    week,
    stage,
    panel,
    secsRange: [Math.min(...brackets.map((b) => b.secs)), Math.max(...brackets.map((b) => b.secs))] as const,
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

type Box = { x: number; y: number; w: number; h: number };

/** Layout boxes the flying cards travel between, in stage coordinates. */
type Geometry = { brackets: Box[]; source: Box; kit: Box[]; week: Box[] };

/** Offsets ignore transforms, so this is the untransformed layout box. */
function boxWithin(el: HTMLElement, root: HTMLElement): Box {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

function measure(stage: HTMLElement): Geometry | null {
  // The phone and the compact bar are both in the DOM; only one is displayed.
  const source = Array.from(stage.querySelectorAll<HTMLElement>('[data-geo="source"]')).find((el) => el.offsetParent);
  if (!source) return null;
  const all = (name: string) =>
    Array.from(stage.querySelectorAll<HTMLElement>(`[data-geo="${name}"]`))
      .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index))
      .map((el) => boxWithin(el, stage));
  return { brackets: all('bracket'), source: boxWithin(source, stage), kit: all('kit'), week: all('week') };
}

const CLIP_KIT = 'h-[89px] w-[50px] sm:h-[184px] sm:w-[104px]';
const EXTRA_KIT = 'h-[64px] w-[110px] sm:h-[184px] sm:w-[156px]';
const CLIP_WEEK = 'h-[89px] w-[50px] sm:h-[128px] sm:w-[72px]';
const EXTRA_WEEK = 'h-[89px] w-full sm:h-[128px] sm:w-full';

function CardFace({ item, size, video }: { item: KitItem; size: 'kit' | 'week'; video: boolean }) {
  const chip = 'relative self-start rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-home-paper sm:px-2 sm:py-1 sm:text-xs';
  if (item.kind === 'clip') {
    return (
      <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[10px] bg-gradient-to-b from-[#2A2D35] to-[#15161B] p-1.5 sm:rounded-[14px] sm:p-2">
        {item.media &&
          (video ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={item.media.video}
              poster={item.media.poster}
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="absolute inset-0 h-full w-full object-cover" src={item.media.poster} alt="" />
          ))}
        {item.media && <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-transparent from-50% to-black/80" />}
        <span className={`${chip} hidden sm:block`}>{item.label}</span>
        {size === 'kit' && !item.media && (
          <span className="relative hidden font-grotesk text-[13px] font-semibold leading-[1.15] sm:line-clamp-5">{item.body}</span>
        )}
        <span className="relative self-end rounded-md bg-home-signal px-1 py-0.5 font-grotesk text-[10px] font-bold tabular-nums text-home-ink sm:px-1.5 sm:text-[13px]">
          {mmss(item.secs)}
        </span>
      </div>
    );
  }
  return (
    <div
      className={`flex h-full w-full flex-col justify-between overflow-hidden rounded-[10px] p-1.5 text-home-ink sm:rounded-[14px] sm:p-2.5 ${
        item.kind === 'post' ? 'bg-home-signal' : 'bg-home-paper'
      }`}
    >
      <span className={chip}>
        <span className="sm:hidden">{item.short}</span>
        <span className="hidden sm:inline">{item.label}</span>
      </span>
      <span
        className={`hidden font-grotesk font-semibold leading-[1.15] tracking-[-0.01em] sm:line-clamp-4 ${
          size === 'kit' ? 'text-[16px]' : 'text-[13px]'
        }`}
      >
        {item.body}
      </span>
    </div>
  );
}

export function KitDemo() {
  const reducedMotion = usePrefersReducedMotion();
  // Server render and first paint show the finished week, so the content never
  // depends on JS. The loop starts once most of the stage is on screen.
  const [t, setT] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [visibility, setVisibility] = useState(0);
  const [geo, setGeo] = useState<Geometry | null>(null);
  const started = useRef(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const persona = DEMO;
  const frame = deriveFrame(persona, t);
  const inView = visibility >= 0.2;

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setVisibility(entry.intersectionRatio), { threshold: [0, 0.2, 0.5] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Re-measure whenever the layout can change: resize or font swap.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setGeo(measure(el));
    const ro = new ResizeObserver(update);
    ro.observe(el);
    document.fonts?.ready.then(update);
    return () => ro.disconnect();
  }, []);

  // Reduced motion never autoplays: it stays on the finished week.
  useEffect(() => {
    if (visibility < 0.5 || started.current || reducedMotion) return;
    started.current = true;
    setT(0);
    setPlaying(true);
  }, [visibility, reducedMotion]);

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

  const togglePlay = () => {
    if (!playing && t >= 1) setT(0);
    setPlaying(!playing);
  };

  const showVideo = !reducedMotion;
  const sizeFor = (item: KitItem, where: 'kit' | 'week') =>
    item.kind === 'clip' ? (where === 'kit' ? CLIP_KIT : CLIP_WEEK) : where === 'kit' ? EXTRA_KIT : EXTRA_WEEK;
  const isLink = persona.source.type === 'link';
  const total = mmss(persona.source.seconds);
  const [minSecs, maxSecs] = frame.secsRange;

  // Cards in flight are drawn in an overlay; settled cards render in their slot.
  const flights = geo
    ? frame.kit.flatMap((item, i) => {
        const kitBox = geo.kit[i];
        const weekBox = geo.week[i];
        if (!kitBox || !weekBox) return [];
        let from: Box;
        let to: Box;
        let p: number;
        let arc: number;
        const lifting = item.fly > 0 && item.fly < 1;
        if (lifting) {
          // A clip lifts off its bracket on the timeline; posts come from the source.
          from = (item.kind === 'clip' && geo.brackets[i]) || geo.source;
          to = kitBox;
          p = item.fly;
          arc = 60;
        } else if (item.drop > 0 && item.drop < 1) {
          from = kitBox;
          to = weekBox;
          p = item.drop;
          arc = 40;
        } else {
          return [];
        }
        const e = easeInOut(p);
        const style: CSSProperties = {
          left: lerp(from.x, to.x, e),
          top: lerp(from.y, to.y, e) - Math.sin(Math.PI * p) * arc,
          width: lerp(from.w, to.w, e),
          height: lerp(from.h, to.h, e),
          transform: `rotate(${(Math.sin(Math.PI * p) * (i % 2 ? -6 : 6)).toFixed(2)}deg)`,
        };
        return [
          <div key={i} className="absolute overflow-hidden rounded-[10px] bg-home-signal sm:rounded-[14px]" style={style}>
            <div className="h-full w-full" style={{ opacity: lifting ? easeOut(clamp((p - 0.15) / 0.6)) : 1 }}>
              <CardFace item={item} size={lifting ? 'kit' : 'week'} video={false} />
            </div>
          </div>,
        ];
      })
    : [];

  const layer = (on: boolean): CSSProperties => ({ opacity: on ? 1 : 0, visibility: on ? 'visible' : 'hidden' });
  const focusClip = frame.focus >= 0 ? persona.clips[frame.focus] : null;
  const liveClip = frame.live >= 0 ? persona.clips[frame.live] : null;

  return (
    <section id="demo" aria-label="Watch one recording become a week of content" className="mx-auto max-w-[1320px] px-4 pb-24 sm:px-6">
      <div ref={stageRef} className="relative flex flex-col gap-4 overflow-hidden rounded-[32px] bg-home-stage p-4 text-home-paper sm:gap-5 sm:p-7">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
          <span className="font-grotesk text-[17px] font-semibold">{persona.who}</span>
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
            <span className="w-[120px] flex-none text-right font-grotesk text-[15px] tabular-nums text-home-stage-muted">{frame.stage}</span>
          </div>
        </div>

        <p className="sr-only">
          {`${persona.source.where}, ${total} long. Echo cut ${persona.clips.length} clips from it: `}
          {persona.clips.map((c, i) => `Clip ${i + 1}, ${mmss(c.end - c.start)}, starting “${c.opening}” `).join('')}
        </p>

        {/* Source + what Echo is doing */}
        <div className="grid gap-4 sm:h-[260px] sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8">
          {/* Phones: a compact source bar instead of the phone frame */}
          <div data-geo="source" className="flex items-center gap-3 rounded-2xl bg-home-stage-raised px-4 py-3 sm:hidden">
            <span aria-hidden="true" className={`h-2.5 w-2.5 flex-none rounded-full ${frame.recording ? 'bg-red-500' : 'bg-[#5A5E68]'}`} />
            <span className="flex-none font-grotesk text-lg font-semibold tabular-nums">{frame.clock}</span>
            <span className="min-w-0 truncate text-sm text-home-stage-muted">{isLink ? persona.source.link : persona.source.where}</span>
          </div>
          <div data-geo="source" className="relative hidden h-full w-[150px] rounded-[28px] bg-black p-2 shadow-[inset_0_0_0_2px_#2A2D35] sm:block">
            <div className="relative h-full overflow-hidden rounded-[21px] bg-home-stage-raised">
              {persona.sourceMedia ? (
                showVideo ? (
                  <video
                    key={persona.sourceMedia.video}
                    className="absolute inset-0 h-full w-full object-cover"
                    src={persona.sourceMedia.video}
                    poster={persona.sourceMedia.poster}
                    autoPlay
                    muted
                    loop
                    playsInline
                    aria-hidden="true"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="absolute inset-0 h-full w-full object-cover" src={persona.sourceMedia.poster} alt="" />
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center gap-[3px]" aria-hidden="true">
                  {Array.from({ length: 14 }, (_, i) => (
                    <span
                      key={i}
                      className="block w-1 rounded bg-home-paper"
                      style={{ height: `${Math.round(8 + (frame.recording ? Math.abs(Math.sin(t * 40 + i * 0.9)) : 0.15) * 50)}px` }}
                    />
                  ))}
                </div>
              )}
              <div className="absolute inset-x-0 top-3 flex justify-center">
                <span className="flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 font-grotesk text-sm font-semibold tabular-nums">
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${frame.recording ? 'bg-red-500' : 'bg-[#8A8F9B]'}`} />
                  {frame.clock}
                </span>
              </div>
              <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1 rounded-xl bg-black/70 p-2 text-[11px] leading-snug">
                {isLink && (
                  <span className="flex items-center gap-1 text-home-stage-muted">
                    <Link2 className="h-3 w-3" aria-hidden="true" />
                    Pasted link
                  </span>
                )}
                <span className="break-all">{isLink ? persona.source.link : persona.source.where}</span>
              </div>
            </div>
          </div>

          {/* Right panel: four layers, one visible at a time */}
          <div aria-hidden="true" className="relative min-h-[190px] min-w-0">
            <div className="absolute inset-0 flex flex-col gap-3" style={layer(frame.panel === 'live')}>
              <span className="text-sm text-home-stage-muted">{isLink ? 'Transcribing as it imports' : 'Live captions'}</span>
              <p className="m-0 font-grotesk text-[22px] font-semibold leading-[1.14] tracking-[-0.02em] sm:text-[clamp(24px,2.6vw,36px)]">
                {liveClip ? liveClip.opening : ''}
              </p>
            </div>

            <div className="absolute inset-0 flex flex-col gap-3 sm:gap-4" style={layer(frame.panel === 'bracket')}>
              {focusClip && (
                <>
                  <span className="text-sm text-home-stage-muted">
                    Clip {frame.focus + 1} of {persona.clips.length}, {mmss(focusClip.start)} to {mmss(focusClip.end)}
                  </span>
                  <p className="m-0 font-grotesk text-[20px] font-semibold leading-[1.16] tracking-[-0.02em] sm:text-[clamp(22px,2.3vw,32px)]">
                    <span
                      className="rounded px-0.5 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
                      style={{
                        color: frame.focusDraw > 0.5 ? '#0E0F13' : undefined,
                        backgroundColor: `rgba(34, 211, 238, ${easeOut(frame.focusDraw).toFixed(3)})`,
                      }}
                    >
                      {focusClip.opening}
                    </span>
                    <span className="text-home-stage-muted">…</span>
                  </p>
                  {/* How long this clip is, against the 90 second max */}
                  <div className="mt-auto flex flex-col gap-1.5">
                    <div className="relative h-3 rounded-full bg-home-stage-raised">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-home-signal"
                        style={{ width: `${((focusClip.end - focusClip.start) / MAX_CLIP_SECS) * easeOut(frame.focusDraw) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between font-grotesk text-xs tabular-nums text-home-stage-muted">
                      <span>0s</span>
                      <span className="text-base font-bold text-home-paper">{Math.round(focusClip.end - focusClip.start)} seconds</span>
                      <span>90s</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <ul className="absolute inset-0 m-0 flex list-none flex-wrap content-end items-end gap-1.5 p-0 sm:flex-nowrap sm:gap-3" style={layer(frame.panel === 'kit')}>
              {frame.kit.map((item, i) => (
                <li
                  key={i}
                  data-geo="kit"
                  data-index={i}
                  className={`flex-none rounded-[10px] outline-1 outline-white/15 outline-dashed sm:rounded-[14px] ${sizeFor(item, 'kit')}`}
                >
                  {item.fly >= 1 && item.drop <= 0 && <CardFace item={item} size="kit" video={showVideo} />}
                </li>
              ))}
            </ul>

            <div className="absolute inset-0 flex flex-col justify-center gap-3" style={layer(frame.panel === 'summary')}>
              <p className="m-0 font-grotesk text-[26px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[clamp(30px,3.6vw,52px)]">
                {persona.clips.length} clips, {minSecs} to {maxSecs} seconds each. A full week. {persona.outro}
              </p>
            </div>
          </div>
        </div>

        {/* The tape: the whole recording, with each clip bracketed where it came from */}
        <div aria-hidden="true" className="flex flex-col gap-1.5">
          <div className="relative h-[84px] rounded-xl bg-home-stage-raised px-2 py-5">
            <div className="flex h-full items-center gap-[2px]">
              {WAVE.map((h, i) => (
                <span
                  key={i}
                  className="block flex-1 rounded-sm"
                  style={{ height: `${Math.round(h * 100)}%`, background: i / WAVE_BARS < frame.playhead ? '#4A4F5C' : '#262830' }}
                />
              ))}
            </div>
            {frame.brackets.map((b, i) => (
              <div
                key={i}
                data-geo="bracket"
                data-index={i}
                className="absolute bottom-5 top-5"
                style={{ left: `calc(8px + (100% - 16px) * ${b.left})`, width: `max(6px, calc((100% - 16px) * ${b.width}))` }}
              >
                <div
                  className="h-full rounded-[3px] border-2 border-home-signal bg-home-signal/30"
                  style={{ width: `${b.draw * 100}%`, opacity: b.draw > 0 ? 1 : 0 }}
                />
                <span
                  // Alternate above/below so neighbouring clips don't collide.
                  className={`absolute left-1/2 -translate-x-1/2 rounded bg-home-signal px-1 font-grotesk text-[11px] font-bold tabular-nums text-home-ink ${
                    i % 2 ? '-bottom-[19px]' : '-top-[19px]'
                  } ${
                    frame.focus === i ? '' : 'hidden sm:block'
                  }`}
                  style={{ opacity: b.draw >= 1 ? 1 : 0 }}
                >
                  {mmss(b.secs)}
                </span>
              </div>
            ))}
            {frame.recording && (
              <span className="absolute bottom-4 top-4 w-0.5 bg-red-500" style={{ left: `calc(8px + (100% - 16px) * ${frame.playhead})` }} />
            )}
          </div>
          <div className="flex justify-between font-grotesk text-xs tabular-nums text-home-stage-muted">
            <span>0:00</span>
            <span>{total}</span>
          </div>
        </div>

        {/* The week */}
        <ol aria-label="Scheduled week" className="m-0 grid list-none grid-cols-4 gap-1.5 p-0 sm:grid-cols-7 sm:gap-2">
          {frame.week.map((d) => {
            const item = frame.kit[d.ref];
            return (
              <li key={d.day} className="flex min-w-0 flex-col gap-1.5 rounded-[14px] bg-home-stage-raised p-1.5 sm:gap-2 sm:p-2.5">
                <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="font-grotesk text-[15px] font-bold sm:text-base">{d.day}</span>
                  <span className="hidden text-[11px] text-home-stage-muted sm:inline" style={{ opacity: d.landed ? 1 : 0 }}>
                    {d.when.split(', ')[1]}
                  </span>
                </span>
                <span className="sr-only">
                  {d.when}: {item.label}
                  {item.kind === 'clip' ? `, ${mmss(item.secs)}` : ''}. {item.body}
                </span>
                <div
                  aria-hidden="true"
                  data-geo="week"
                  data-index={d.ref}
                  className={`rounded-[10px] sm:rounded-[14px] ${sizeFor(item, 'week')} ${d.landed ? '' : 'outline-1 outline-white/15 outline-dashed'}`}
                >
                  {d.landed && <CardFace item={item} size="week" video={showVideo} />}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="m-0 text-[13px] leading-normal text-home-stage-muted">{persona.note}</p>

        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
          {flights}
        </div>
      </div>
    </section>
  );
}
