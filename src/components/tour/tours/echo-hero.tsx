'use client';

/**
 * Echo Hero tour, v2.
 *
 * Mounts inside EchoHero; fires once per user (tour id: create-hero-v2).
 * Replay pill re-fires without persisting again.
 *
 * Anchors live on:
 *   - echo-hero-input   Hero input surface (composer card) — used twice:
 *                       opener ("Start here") and closer ("One place for everything")
 *   - echo-hero-attach  Paperclip attach label
 *   - echo-hero-mic     Mic record button
 *
 * Framing: the composer is the single injection point for both voice and
 * content. Do not point users out to the knowledge base or voice page; all
 * ingestion happens right here in the chat. (echo-hero-voice / VoiceLearningChip
 * stays as a status indicator but the tour no longer anchors on it.)
 *
 * Voice-scope rule: voice = written posts only. The clip IS the user on
 * camera. Never say clips "sound like you."
 *
 * Versioning: bump to create-hero-v3 when the composer layout changes
 * meaningfully.
 */
import { useState } from 'react';
import type { TourStep } from '../MobileTourSheet';
import { FeatureTour } from '../FeatureTour';
import { TourReplayPill } from '../TourReplayPill';

const STEPS: TourStep[] = [
  {
    target: "[data-tour='echo-hero-input']",
    title: 'Start here',
    content:
      'Paste a YouTube link, drop a video, type a topic, or just talk. This is where everything starts.',
    placement: 'bottom',
  },
  {
    target: "[data-tour='echo-hero-attach']",
    title: 'Feed Echo anything',
    content:
      'Drop a video, PDF, doc, or paste a link. It all comes in right here. Echo learns from it and turns it into clips and written posts. No knowledge base to set up.',
    placement: 'top',
  },
  {
    target: "[data-tour='echo-hero-mic']",
    title: 'Talk it out',
    content:
      'Tap to record. Echo transcribes what you say and uses it as your starting point.',
    placement: 'top',
  },
  {
    target: "[data-tour='echo-hero-input']",
    title: 'One place for everything',
    content:
      'Voice and content both come in right here. No knowledge base to manage, no separate setup. Just share and Echo learns.',
    placement: 'bottom',
  },
];

export function EchoHeroTour() {
  const [replayNonce, setReplayNonce] = useState(0);
  return (
    <>
      <FeatureTour
        tourId="create-hero-v2"
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
