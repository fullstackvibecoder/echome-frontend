'use client';

/**
 * Throwaway preview for the coded sketch explainers. Visit /sketch-preview
 * with `npm run dev`. Delete once scenes are wired into real surfaces.
 */

import { SketchExplainer } from '@/components/sketch/SketchExplainer';
import { PlatformDemo, type DemoAnnotation } from '@/components/sketch/PlatformDemo';

// ---- "Do this, get that" demos over the real Create page -----------------
// Coords live in the screenshot's 684x646 pixel space (public/demo/composer.png,
// admin Create page captured 2026-06-17). Each demo is one literal cause->effect:
// frame the box (DO), sweep up to the on-screen payoff (GET). Both claims are
// shipped + true. The proposal cards literally read OPINION CAROUSEL / SHORT
// CONTENT SERIES / THOUGHT LEADERSHIP POST; the meter has the Voice bar.
// Fine-tune by eye at /sketch-preview; the overlay shares the image's viewBox.

// DO: drop a video -> GET: clips, carousels, posts (the proposal cards above).
// DO pill floats in the gap ABOVE the input box (single line), so the short
// down-arrow reading "put it HERE" is earned. GET is the emerald pulsing payoff.
const VIDEO_STEPS: DemoAnnotation[] = [
  { kind: 'ring', x: 14, y: 454, w: 656, h: 132, rx: 16, at: 0.2 },
  // DO pill floats in the gap above the box. w must keep it ONE line, else it
  // wraps and the second line drops onto the placeholder inside the box. y is
  // lifted so the pill bottom clears the ring top (462); the arrow bridges down.
  { kind: 'label', x: 118, y: 408, tone: 'do', w: 540, text: 'Upload a video or paste a video link here', at: 0.4 },
  { kind: 'arrow', x1: 300, y1: 448, x2: 300, y2: 460, at: 1.4 },
  // GET sits directly above DO and a connector ties them: one downward flow,
  // outcome -> action -> box. Centered so both pills share the same eyeful.
  { kind: 'label', x: 186, y: 312, tone: 'get', w: 312, text: 'Get clips, carousels, and posts', sub: 'cut and written in your voice', at: 2.6 },
  { kind: 'arrow', x1: 320, y1: 366, x2: 320, y2: 418, at: 3.0 },
];

// DO: paste channel links -> GET: voice-match system builds (the meter above).
const CHANNEL_STEPS: DemoAnnotation[] = [
  { kind: 'ring', x: 14, y: 454, w: 656, h: 132, rx: 16, at: 0.2 },
  { kind: 'label', x: 96, y: 408, tone: 'do', w: 560, text: 'Paste your IG and YouTube channel links here', at: 0.4 },
  { kind: 'arrow', x1: 300, y1: 448, x2: 300, y2: 460, at: 1.4 },
  { kind: 'ring', x: 8, y: 278, w: 670, h: 142, rx: 12, at: 2.0 },
  { kind: 'label', x: 184, y: 326, tone: 'get', w: 330, text: 'We build your voice-match system', sub: 'it learns to sound like you', at: 2.6 },
];

// ---- Drafted-for-you demo (beat 5) ---------------------------------------
// Placeholder over 1200x560. Re-point after capturing the dashboard section.
const DRAFTS_STEPS: DemoAnnotation[] = [
  { kind: 'ring', x: 120, y: 120, w: 960, h: 360, rx: 18, at: 0.2 },
  { kind: 'label', x: 140, y: 100, text: 'Every morning: 3 fresh posts, drawn from your KB', at: 0.7 },
  { kind: 'ring', x: 760, y: 150, w: 150, h: 40, rx: 20, at: 2.4 },
  { kind: 'label', x: 600, y: 510, text: '"Echo drafted" — in your voice, waiting for review', at: 2.8 },
];

const SCENES: { id: 'what-is-echome' | 'video-to-kit' | 'build-voice' | 'schedule'; title: string; caption: string }[] = [
  { id: 'what-is-echome', title: 'What is EchoMe', caption: 'One video. Echo learns your voice, then turns it into clips, posts, and carousels for your week.' },
  { id: 'video-to-kit', title: 'Drop a video to a kit', caption: 'One video in, a full content kit out.' },
  { id: 'build-voice', title: 'Build your voice', caption: 'Feed it your material, it learns to sound like you.' },
  { id: 'schedule', title: 'Schedule and autopilot', caption: 'Lay it across your week, Echo posts it.' },
];

export default function SketchPreviewPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Sketch explainers — preview</h1>
      <p style={{ color: '#6b7280', marginBottom: 32 }}>
        Each scrolls into view, draws itself, loops. Silent, coded, no assets. Same engine, swap the `scene` prop.
      </p>

      {SCENES.map((s) => (
        <section key={s.id} style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>
            {s.title} <span style={{ color: '#9ca3af', fontWeight: 400 }}>· scene=&quot;{s.id}&quot;</span>
          </p>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 24 }}>
            <SketchExplainer scene={s.id} caption={s.caption} />
          </div>
        </section>
      ))}

      {/* ---- Platform demos: coded annotation over real screenshots ---- */}
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '40px 0 6px' }}>Platform demos — overlay engine</h2>
      <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>
        Same engine, but annotations draw over a real screenshot. Placeholder now;
        drop the captured PNG into <code>src</code> and nudge coords to the real pixels.
      </p>

      <section style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>
          Do this, get that · video <span style={{ color: '#9ca3af', fontWeight: 400 }}>· EchoHero composer</span>
        </p>
        <PlatformDemo
          width={684}
          height={646}
          src="/demo/composer.png"
          alt="EchoMe Create page: drop a video, get clips, carousels, and posts"
          steps={VIDEO_STEPS}
          periodMs={6500}
          caption="Drop a video or paste a video link. Echo cuts clips, carousels, and posts in your voice."
        />
      </section>

      <section style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>
          Do this, get that · channels <span style={{ color: '#9ca3af', fontWeight: 400 }}>· EchoHero composer</span>
        </p>
        <PlatformDemo
          width={684}
          height={646}
          src="/demo/composer.png"
          alt="EchoMe Create page: paste your channel links, Echo builds your voice match"
          steps={CHANNEL_STEPS}
          periodMs={6500}
          caption="Paste your IG and YouTube channel links. Echo captures the data and builds your voice match."
        />
      </section>

      <section style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>
          Drafted for you <span style={{ color: '#9ca3af', fontWeight: 400 }}>· dashboard section</span>
        </p>
        <PlatformDemo
          width={1200}
          height={560}
          steps={DRAFTS_STEPS}
          periodMs={6000}
          caption="Echo drafts 3 posts every morning from your KB. They wait in your inbox, in your voice."
        />
      </section>

      {/* One on dark, to show recolor is a single prop. */}
      <section style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>
          On dark <span style={{ color: '#9ca3af', fontWeight: 400 }}>· accent=&quot;#ffffff&quot;</span>
        </p>
        <div style={{ background: '#0b1220', borderRadius: 16, padding: 24 }}>
          <SketchExplainer scene="what-is-echome" accent="#ffffff" caption="On dark — recolor is one prop." />
        </div>
      </section>
    </div>
  );
}
