'use client';

/**
 * SketchExplainer — dependency-free "self-drawing" micro explainers.
 *
 * No animation library, no asset files, no designer, no styled-jsx. Each scene
 * is coded SVG whose strokes draw themselves via CSS (stroke-dashoffset over
 * pathLength=1), captions fade up on a stagger. Silent, looping, inline. Drop
 * wherever a user meets new UI: EchoHero empty state, tour steps, KB page.
 *
 * Scoping: a plain <style> tag inside the SVG, selectors prefixed with a
 * per-instance class derived from useId() (sanitized — useId returns colons,
 * illegal in CSS). Keyframe names are suffixed with the same scope so two
 * instances on one page (light + dark) never clobber each other.
 *
 * Looping: CSS animates each element ONCE; React remounts the scene on a timer
 * (key bump) to replay. IntersectionObserver gates the timer so it only runs
 * in view. prefers-reduced-motion freezes on the final frame (no timer).
 *
 * Add a scene: copy Scene1, swap the <g> shapes + captions + delays. Register
 * it in SCENES. Embed: <SketchExplainer scene="what-is-echome" />.
 */

import { useEffect, useId, useRef, useState } from 'react';

const CYCLE_MS = 7000;

type SceneId = 'what-is-echome' | 'video-to-kit' | 'build-voice' | 'schedule';

interface SceneProps {
  accent: string;
  /** Unique, CSS-safe class that scopes this instance's <style>. */
  scope: string;
  /** When true, render the final frame with no animation (reduced motion). */
  paused: boolean;
}

/** CSS for one scene instance, scoped to `.${scope}`. */
function sceneCss(scope: string, accent: string): string {
  return `
.${scope} { display: block; overflow: visible; }
.${scope} .stroke {
  fill: none;
  stroke: ${accent};
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw-${scope} 0.55s ease forwards;
  animation-delay: var(--d, 0s);
}
.${scope} .thin { stroke-width: 1.6; }
.${scope} .cap {
  fill: ${accent};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  font-weight: 600;
  text-anchor: middle;
  opacity: 0;
  transform: translateY(6px);
  animation: rise-${scope} 0.4s ease forwards;
  animation-delay: var(--d, 0s);
}
.${scope} .cap.sub { font-size: 12px; font-weight: 500; }
@keyframes draw-${scope} { to { stroke-dashoffset: 0; } }
@keyframes rise-${scope} { to { opacity: 1; transform: translateY(0); } }
.${scope}.paused .stroke { animation: none; stroke-dashoffset: 0; }
.${scope}.paused .cap { animation: none; opacity: 1; transform: none; }
`;
}

// ---- Scene 1: "What is EchoMe" -------------------------------------------
// Honest topology: ONE input -> a hub -> a fan-out of siblings -> a collector.
// NOT a conga line (that falsely implied each feature feeds the next; you can't
// "clip" a voice note — clips come from the video). Layout:
//   INPUT   video (left)            — one talking video, the single source
//   HUB     Echo (center)           — learns your voice + reads every minute
//   FAN     clips / posts / carousels (T-junctions off one spine, right)
//           — siblings, all cut/written FROM the one video, in your voice
//   COLLECT calendar (bottom)       — laid across your week, you approve
// Spine is vertical; outputs branch right off it; spine continues to calendar.

function Scene1({ accent, scope, paused }: SceneProps) {
  return (
    <svg
      viewBox="0 0 470 440"
      width="100%"
      role="img"
      aria-label="One talking video. Echo learns your voice and reads every minute, then turns that one video into clips cut from it, plus posts and carousels in your voice, all laid across your week for you to approve."
      className={`${scope} ${paused ? 'paused' : ''}`}
    >
      <style dangerouslySetInnerHTML={{ __html: sceneCss(scope, accent) }} />

      {/* ============ INPUT: one talking video ============ */}
      <g>
        <rect x="20" y="24" width="84" height="56" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '0s' }} />
        <path d="M48 40 L48 64 L72 52 Z" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.25s' }} />
      </g>
      <text x="62" y="104" className="cap" style={{ ['--d' as string]: '0.5s' }}>Your video</text>
      <text x="62" y="121" className="cap sub" style={{ ['--d' as string]: '0.6s' }}>you talking, like always</text>

      {/* Arrow: video -> Echo */}
      <path d="M110 52 H170" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.8s' }} />
      <path d="M162 45 L172 52 L162 59" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.95s' }} />

      {/* ============ HUB: Echo learns your voice + reads it ============ */}
      <g>
        <circle cx="210" cy="52" r="34" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.1s' }} />
        {/* voice waveform — learns how you sound */}
        <path d="M196 58 V50 M204 58 V44 M212 58 V40 M220 58 V46 M228 58 V52" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '1.35s' }} />
        {/* transcript lines — reads every minute */}
        <path d="M198 66 H228 M198 72 H222" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '1.5s' }} />
      </g>
      <text x="258" y="48" className="cap" style={{ ['--d' as string]: '1.7s', textAnchor: 'start' }}>Echo learns your voice</text>
      <text x="258" y="65" className="cap sub" style={{ ['--d' as string]: '1.8s', textAnchor: 'start' }}>and reads every minute</text>

      {/* ============ SPINE + FAN-OUT ============ */}
      {/* spine: Echo down to first branch */}
      <path d="M210 86 V140" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.0s' }} />

      {/* branch 1 -> clips */}
      <path d="M210 140 H300" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '2.15s' }} />
      <g>
        <rect x="300" y="116" width="80" height="48" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.3s' }} />
        <path d="M322 130 L322 150 L342 140 Z" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.5s' }} />
        <path d="M312 157 H368" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '2.62s' }} />
      </g>
      <text x="388" y="136" className="cap" style={{ ['--d' as string]: '2.75s', textAnchor: 'start' }}>Clips</text>
      <text x="388" y="152" className="cap sub" style={{ ['--d' as string]: '2.85s', textAnchor: 'start' }}>cut from it</text>

      {/* spine continues */}
      <path d="M210 140 V200" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.0s' }} />

      {/* branch 2 -> posts */}
      <path d="M210 200 H300" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '3.15s' }} />
      <g>
        <rect x="300" y="176" width="80" height="48" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.3s' }} />
        <path d="M312 192 H368 M312 202 H356 M312 212 H364" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '3.5s' }} />
      </g>
      <text x="388" y="196" className="cap" style={{ ['--d' as string]: '3.65s', textAnchor: 'start' }}>Posts</text>
      <text x="388" y="212" className="cap sub" style={{ ['--d' as string]: '3.75s', textAnchor: 'start' }}>in your voice</text>

      {/* spine continues */}
      <path d="M210 200 V260" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.9s' }} />

      {/* branch 3 -> carousels (stacked slides) */}
      <path d="M210 260 H300" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '4.05s' }} />
      <g>
        <rect x="316" y="234" width="48" height="44" rx="6" pathLength={1} className="stroke" style={{ ['--d' as string]: '4.2s' }} />
        <rect x="308" y="242" width="48" height="44" rx="6" pathLength={1} className="stroke" style={{ ['--d' as string]: '4.32s' }} />
        <rect x="300" y="250" width="48" height="44" rx="6" pathLength={1} className="stroke" style={{ ['--d' as string]: '4.44s' }} />
        <path d="M308 282 L318 272 L326 280 L336 270" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '4.6s' }} />
      </g>
      <text x="388" y="266" className="cap" style={{ ['--d' as string]: '4.75s', textAnchor: 'start' }}>Carousels</text>
      <text x="388" y="282" className="cap sub" style={{ ['--d' as string]: '4.85s', textAnchor: 'start' }}>in your voice</text>

      {/* ============ COLLECT: spine drops to the calendar ============ */}
      <path d="M210 260 V304" pathLength={1} className="stroke" style={{ ['--d' as string]: '5.0s' }} />
      <path d="M202 296 L210 306 L218 296" pathLength={1} className="stroke" style={{ ['--d' as string]: '5.15s' }} />
      <g>
        <rect x="168" y="308" width="84" height="58" rx="6" pathLength={1} className="stroke" style={{ ['--d' as string]: '5.3s' }} />
        <path d="M168 324 H252" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '5.5s' }} />
        <path d="M189 324 V366 M210 324 V366 M231 324 V366 M168 345 H252" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '5.62s' }} />
        <circle cx="199" cy="335" r="2.5" pathLength={1} className="stroke" style={{ ['--d' as string]: '5.8s' }} />
        <circle cx="220" cy="356" r="2.5" pathLength={1} className="stroke" style={{ ['--d' as string]: '5.9s' }} />
        <circle cx="241" cy="335" r="2.5" pathLength={1} className="stroke" style={{ ['--d' as string]: '6.0s' }} />
      </g>
      <text x="210" y="392" className="cap" style={{ ['--d' as string]: '6.15s' }}>Laid across your week</text>
      <text x="210" y="409" className="cap sub" style={{ ['--d' as string]: '6.25s' }}>you approve, it posts</text>
    </svg>
  );
}

// ---- Scene 2: "Drop a video -> a kit" ------------------------------------
// Snake: upload -> Echo watches -> clips fan out, drop, posts -> full kit.

function SceneVideoToKit({ accent, scope, paused }: SceneProps) {
  return (
    <svg
      viewBox="0 0 520 360"
      width="100%"
      role="img"
      aria-label="Drop a video or paste a link. Echo watches it, cuts captioned clips scored by engagement, writes captions for every platform, and hands you a full content kit."
      className={`${scope} ${paused ? 'paused' : ''}`}
    >
      <style dangerouslySetInnerHTML={{ __html: sceneCss(scope, accent) }} />

      {/* Beat 1: upload box */}
      <g>
        <rect x="58" y="32" width="64" height="54" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '0s' }} />
        <path d="M90 76 V48" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.2s' }} />
        <path d="M78 60 L90 48 L102 60" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.35s' }} />
      </g>
      <text x="90" y="124" className="cap" style={{ ['--d' as string]: '0.55s' }}>Drop a video</text>
      <text x="90" y="141" className="cap sub" style={{ ['--d' as string]: '0.65s' }}>or paste a YouTube link</text>

      <path d="M120 60 H210" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.85s' }} />
      <path d="M202 52 L212 60 L202 68" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.0s' }} />

      {/* Beat 2: an eye — Echo watches it */}
      <g>
        <path d="M226 60 Q260 34 294 60 Q260 86 226 60 Z" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.1s' }} />
        <circle cx="260" cy="60" r="9" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.3s' }} />
      </g>
      <text x="260" y="124" className="cap" style={{ ['--d' as string]: '1.5s' }}>Echo watches it</text>
      <text x="260" y="141" className="cap sub" style={{ ['--d' as string]: '1.6s' }}>finds the best moments</text>

      <path d="M298 60 H388" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.8s' }} />
      <path d="M380 52 L390 60 L380 68" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.95s' }} />

      {/* Beat 3: clips fan out */}
      <g>
        <rect x="408" y="30" width="58" height="46" rx="6" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.05s' }} />
        <rect x="400" y="36" width="58" height="46" rx="6" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.2s' }} />
        <rect x="392" y="42" width="58" height="46" rx="6" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.35s' }} />
        <path d="M412 56 L412 74 L428 65 Z" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.55s' }} />
      </g>
      <text x="430" y="124" className="cap" style={{ ['--d' as string]: '2.75s' }}>Cuts captioned clips</text>
      <text x="430" y="141" className="cap sub" style={{ ['--d' as string]: '2.85s' }}>scored by engagement</text>

      {/* drop 3 -> 4 */}
      <path d="M430 160 V196" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.05s' }} />
      <path d="M422 188 L430 198 L438 188" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.2s' }} />

      {/* Beat 4: post card with platform dots */}
      <g>
        <rect x="398" y="206" width="64" height="62" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.35s' }} />
        <path d="M408 222 H452 M408 234 H444" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '3.55s' }} />
        <circle cx="414" cy="254" r="3" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '3.7s' }} />
        <circle cx="428" cy="254" r="3" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '3.78s' }} />
        <circle cx="442" cy="254" r="3" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '3.86s' }} />
      </g>
      <text x="430" y="300" className="cap" style={{ ['--d' as string]: '4.05s' }}>Writes the captions</text>
      <text x="430" y="317" className="cap sub" style={{ ['--d' as string]: '4.15s' }}>for every platform</text>

      <path d="M392 236 H264" pathLength={1} className="stroke" style={{ ['--d' as string]: '4.35s' }} />
      <path d="M272 228 L262 236 L272 244" pathLength={1} className="stroke" style={{ ['--d' as string]: '4.5s' }} />

      {/* Beat 5: a full kit with a check */}
      <g>
        <rect x="160" y="210" width="68" height="54" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '4.65s' }} />
        <rect x="152" y="218" width="68" height="54" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '4.8s' }} />
        <path d="M168 244 L182 258 L208 230" pathLength={1} className="stroke" style={{ ['--d' as string]: '5.05s' }} />
      </g>
      <text x="186" y="300" className="cap" style={{ ['--d' as string]: '5.25s' }}>One video</text>
      <text x="186" y="317" className="cap sub" style={{ ['--d' as string]: '5.35s' }}>a full content kit</text>
    </svg>
  );
}

// ---- Scene 3: "Build your voice" -----------------------------------------
// Single row: add material -> Echo reads it -> voice strength grows -> output sounds like you.

function SceneBuildVoice({ accent, scope, paused }: SceneProps) {
  return (
    <svg
      viewBox="0 0 520 200"
      width="100%"
      role="img"
      aria-label="Add your material: posts, blogs, emails, voice. Echo reads it all and maps how you write. Your voice strength grows the more you add, so everything comes out sounding like you."
      className={`${scope} ${paused ? 'paused' : ''}`}
    >
      <style dangerouslySetInnerHTML={{ __html: sceneCss(scope, accent) }} />

      {/* Beat 1: a document (your material) */}
      <g>
        <path d="M48 34 H78 L92 48 V92 H48 Z" pathLength={1} className="stroke" style={{ ['--d' as string]: '0s' }} />
        <path d="M78 34 V48 H92" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '0.18s' }} />
        <path d="M56 60 H84 M56 70 H80 M56 80 H82" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '0.3s' }} />
      </g>
      <text x="70" y="118" className="cap" style={{ ['--d' as string]: '0.5s' }}>Add your material</text>
      <text x="70" y="135" className="cap sub" style={{ ['--d' as string]: '0.6s' }}>posts, blogs, emails, voice</text>

      <path d="M100 64 H160" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.8s' }} />
      <path d="M152 56 L162 64 L152 72" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.95s' }} />

      {/* Beat 2: Echo reads it (circle + script lines) */}
      <g>
        <circle cx="200" cy="64" r="30" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.05s' }} />
        <path d="M186 56 Q200 70 214 56 M186 72 Q200 60 214 72" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '1.25s' }} />
      </g>
      <text x="200" y="118" className="cap" style={{ ['--d' as string]: '1.45s' }}>Echo reads it all</text>
      <text x="200" y="135" className="cap sub" style={{ ['--d' as string]: '1.55s' }}>maps how you write</text>

      <path d="M232 64 H300" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.8s' }} />
      <path d="M292 56 L302 64 L292 72" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.95s' }} />

      {/* Beat 3: voice meter filling */}
      <g>
        <rect x="312" y="40" width="68" height="48" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.05s' }} />
        <path d="M324 76 V64 M336 76 V54 M348 76 V46 M360 76 V56 M372 76 V66" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '2.3s' }} />
      </g>
      <text x="346" y="118" className="cap" style={{ ['--d' as string]: '2.5s' }}>Voice strength grows</text>
      <text x="346" y="135" className="cap sub" style={{ ['--d' as string]: '2.6s' }}>the more you add</text>

      <path d="M384 64 H432" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.85s' }} />
      <path d="M424 56 L434 64 L424 72" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.0s' }} />

      {/* Beat 4: output post that sounds like you */}
      <g>
        <rect x="438" y="36" width="64" height="56" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.1s' }} />
        <path d="M448 54 H492 M448 66 H484 M448 78 H490" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '3.3s' }} />
      </g>
      <text x="470" y="118" className="cap" style={{ ['--d' as string]: '3.5s' }}>Comes out</text>
      <text x="470" y="135" className="cap sub" style={{ ['--d' as string]: '3.6s' }}>sounding like you</text>
    </svg>
  );
}

// ---- Scene 4: "Schedule and autopilot" -----------------------------------
// Single row: your kit -> onto your week -> connect accounts -> Echo posts.

function SceneSchedule({ accent, scope, paused }: SceneProps) {
  return (
    <svg
      viewBox="0 0 520 200"
      width="100%"
      role="img"
      aria-label="Your content kit drops onto your week. Connect your accounts: Instagram, LinkedIn, Facebook. Echo posts for you. You just approve."
      className={`${scope} ${paused ? 'paused' : ''}`}
    >
      <style dangerouslySetInnerHTML={{ __html: sceneCss(scope, accent) }} />

      {/* Beat 1: the kit */}
      <g>
        <rect x="52" y="40" width="56" height="48" rx="6" pathLength={1} className="stroke" style={{ ['--d' as string]: '0s' }} />
        <rect x="44" y="48" width="56" height="48" rx="6" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.15s' }} />
        <path d="M52 70 H92 M52 80 H84" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '0.3s' }} />
      </g>
      <text x="72" y="122" className="cap" style={{ ['--d' as string]: '0.5s' }}>Your content kit</text>
      <text x="72" y="139" className="cap sub" style={{ ['--d' as string]: '0.6s' }}>ready to go</text>

      <path d="M104 66 H162" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.8s' }} />
      <path d="M154 58 L164 66 L154 74" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.95s' }} />

      {/* Beat 2: calendar */}
      <g>
        <rect x="176" y="38" width="64" height="54" rx="6" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.05s' }} />
        <path d="M176 54 H240" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '1.25s' }} />
        <path d="M192 54 V92 M208 54 V92 M224 54 V92 M176 70 H240 M176 82 H240" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '1.4s' }} />
        <circle cx="200" cy="64" r="2.5" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.6s' }} />
        <circle cx="216" cy="76" r="2.5" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.7s' }} />
      </g>
      <text x="208" y="122" className="cap" style={{ ['--d' as string]: '1.9s' }}>Onto your week</text>
      <text x="208" y="139" className="cap sub" style={{ ['--d' as string]: '2.0s' }}>drag to any slot</text>

      <path d="M252 66 H312" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.2s' }} />
      <path d="M304 58 L314 66 L304 74" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.35s' }} />

      {/* Beat 3: connected accounts (three linked nodes) */}
      <g>
        <circle cx="338" cy="56" r="12" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.45s' }} />
        <circle cx="372" cy="48" r="12" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.6s' }} />
        <circle cx="368" cy="82" r="12" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.75s' }} />
        <path d="M349 52 L361 50 M348 62 L360 76" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '2.9s' }} />
      </g>
      <text x="356" y="122" className="cap" style={{ ['--d' as string]: '3.1s' }}>Your accounts</text>
      <text x="356" y="139" className="cap sub" style={{ ['--d' as string]: '3.2s' }}>IG, LinkedIn, Facebook</text>

      <path d="M396 66 H444" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.4s' }} />
      <path d="M436 58 L446 66 L436 74" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.55s' }} />

      {/* Beat 4: auto-post (paper plane) */}
      <g>
        <path d="M452 64 L506 40 L488 80 L480 64 Z" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.65s' }} />
        <path d="M480 64 L506 40" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '3.85s' }} />
      </g>
      <text x="478" y="122" className="cap" style={{ ['--d' as string]: '4.05s' }}>Echo posts</text>
      <text x="478" y="139" className="cap sub" style={{ ['--d' as string]: '4.15s' }}>you just approve</text>
    </svg>
  );
}

const SCENES: Record<SceneId, (p: SceneProps) => React.JSX.Element> = {
  'what-is-echome': Scene1,
  'video-to-kit': SceneVideoToKit,
  'build-voice': SceneBuildVoice,
  'schedule': SceneSchedule,
};

/** Per-scene loop length. Detailed scenes draw longer, then hold before replay. */
const SCENE_DURATIONS: Record<SceneId, number> = {
  'what-is-echome': 9500,
  'video-to-kit': 9500,
  'build-voice': 7500,
  'schedule': 8000,
};

// ---- Wrapper: in-view gating + loop + reduced-motion ----------------------

interface SketchExplainerProps {
  scene?: SceneId;
  accent?: string;
  /** Optional spoken-summary line under the sketch. */
  caption?: string;
  className?: string;
}

export function SketchExplainer({
  scene = 'what-is-echome',
  accent = '#0077AA',
  caption,
  className,
}: SketchExplainerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [cycle, setCycle] = useState(0);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);

  // useId() returns colons (":r1:") which are illegal in CSS selectors. Strip.
  const rawId = useId();
  const scope = `sk${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  // Respect prefers-reduced-motion.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Play only while scrolled into view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Loop by remounting the scene every cycle while in view.
  useEffect(() => {
    if (reduced || !inView) return;
    const period = SCENE_DURATIONS[scene] ?? CYCLE_MS;
    const id = setInterval(() => setCycle((c) => c + 1), period);
    return () => clearInterval(id);
  }, [reduced, inView, scene]);

  const Scene = SCENES[scene];
  const paused = reduced || !inView;

  return (
    <div ref={ref} className={className}>
      <Scene key={cycle} accent={accent} scope={scope} paused={paused} />
      {caption ? (
        <p
          style={{
            margin: '10px 0 0',
            textAlign: 'center',
            fontSize: 13,
            color: '#6b7280',
            lineHeight: 1.5,
          }}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}

export default SketchExplainer;
