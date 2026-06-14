'use client';

/**
 * Echo Hero tour, v1.
 *
 * Mounts inside EchoHero; fires once per user (tour id: create-hero-v1).
 * Replay pill re-fires without persisting again.
 *
 * Anchors live on:
 *   - echo-hero-input   Hero input surface (composer card)
 *   - echo-hero-attach  Paperclip attach label
 *   - echo-hero-mic     Mic record button
 *   - echo-hero-voice   VoiceLearningChip
 *
 * Voice-scope rule: voice = written posts only. The clip IS the user on
 * camera. Never say clips "sound like you."
 *
 * Versioning: bump to create-hero-v2 when the composer layout or
 * voice-chip position changes meaningfully.
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
    title: 'Attach a file',
    content:
      'Drop in a video, PDF, or document. Echo processes it and turns it into clips and written posts.',
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
    target: "[data-tour='echo-hero-voice']",
    title: 'Echo learns from your content',
    content:
      'Echo reads your Instagram, YouTube, posts, and emails so your written captions and posts come out sounding like you. Tap to manage your voice profile.',
    placement: 'top',
  },
];

export function EchoHeroTour() {
  const [replayNonce, setReplayNonce] = useState(0);
  return (
    <>
      <FeatureTour
        tourId="create-hero-v1"
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
