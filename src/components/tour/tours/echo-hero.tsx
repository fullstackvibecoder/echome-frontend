'use client';

/**
 * Echo Hero tour, v3.
 *
 * Mounts inside EchoHero; fires once per user (tour id: create-hero-v3).
 * Replay pill re-fires without persisting again.
 *
 * Five steps that separate the two jobs a cold user must grasp — teach Echo
 * your voice (ingest) vs make content (create) — instead of cramming both into
 * one card:
 *   1. echo-hero-input   What this does (orientation)
 *   2. echo-hero-attach  Teach Echo your voice (file/link ingest)
 *   3. echo-hero-mic     Talking teaches it fastest (strongest ingest + can become content)
 *   4. echo-hero-input   Or just make something (the create path)
 *   5. echo-hero-input   Best first move (concrete next step)
 *
 * Framing: the composer is the single injection point for both voice and
 * content. Do not point users out to the knowledge base or voice page; all
 * ingestion happens right here in the chat. User-facing name for the KB is
 * "your voice" — never say "knowledge base". (echo-hero-voice /
 * VoiceLearningChip stays as a status indicator but the tour does not anchor
 * on it.)
 *
 * Voice-scope rule: voice = written posts only. The clip IS the user on
 * camera. Never say clips "sound like you."
 *
 * Guide deep-links are intentionally omitted: the in-app guides describe the
 * old UI and are queued for a refresh. Add per-step guide links once that
 * ships.
 *
 * Versioning: bump to create-hero-v4 when the composer layout changes
 * meaningfully.
 */
import { useState } from 'react';
import type { TourStep } from '../MobileTourSheet';
import { FeatureTour } from '../FeatureTour';
import { TourReplayPill } from '../TourReplayPill';

const STEPS: TourStep[] = [
  {
    target: "[data-tour='echo-hero-input']",
    title: 'What this does',
    content:
      'Echo learns how you talk, then writes posts in your voice and cuts clips from your videos. It all happens in this box.',
    placement: 'bottom',
  },
  {
    target: "[data-tour='echo-hero-attach']",
    title: 'Teach Echo your voice',
    content:
      'Drop a video, PDF, or doc, or paste a link. Echo reads it and learns how you write and talk. The more you add, the more your posts sound like you, not generic AI.',
    placement: 'top',
  },
  {
    target: "[data-tour='echo-hero-mic']",
    title: 'Talking teaches it fastest',
    content:
      'Tap and talk for two minutes. Nothing teaches Echo your voice faster than your actual voice. The same recording can also become your first post or clip.',
    placement: 'top',
  },
  {
    target: "[data-tour='echo-hero-input']",
    title: 'Or just make something',
    content:
      'In a hurry? Type a topic or paste a link and ask Echo to draft a post. It works best after you have fed it a few things, so it sounds like you.',
    placement: 'bottom',
  },
  {
    target: "[data-tour='echo-hero-input']",
    title: 'Best first move',
    content:
      'Tap the mic and talk for two minutes. That one step teaches Echo your voice and gives it something to build from.',
    placement: 'bottom',
  },
];

export function EchoHeroTour() {
  const [replayNonce, setReplayNonce] = useState(0);
  return (
    <>
      <FeatureTour
        tourId="create-hero-v3"
        steps={STEPS}
        replayNonce={replayNonce}
      />
      <TourReplayPill
        onClick={() => setReplayNonce((k) => k + 1)}
        label="Replay tour"
      />
    </>
  );
}
