'use client';

/**
 * Clip editor tour — v1.
 *
 * Mounts inside ClipEditorModal; fires 500ms after the modal opens, exactly
 * once per user (tour id: clip-editor-v1). Replay pill re-fires without
 * persisting again.
 *
 * Anchors live on:
 *   - clip-editor-caption    CaptionOverlay outer wrapper
 *   - clip-editor-resize     CaptionOverlay's corner resize handle
 *   - clip-editor-transcript Transcript list container in ClipEditorModal
 *
 * Versioning: bump to clip-editor-v2 when affordances change meaningfully
 * (resize handle moves, new keyboard shortcut added, etc.).
 *
 * See docs/superpowers/specs/2026-05-23-guided-tour-system-design.md §9.1.
 */
import { useState } from 'react';
import type { TourStep } from '../MobileTourSheet';
import { FeatureTour } from '../FeatureTour';
import { TourReplayPill } from '../TourReplayPill';

const STEPS: TourStep[] = [
  {
    target: "[data-tour='clip-editor-caption']",
    title: 'Drag the caption to move it',
    content:
      'Captions are auto-positioned at the bottom, but you can drag them anywhere on the video.',
    placement: 'top',
  },
  {
    target: "[data-tour='clip-editor-resize']",
    title: 'Resize from the corner handle',
    content:
      "Drag the small square at the caption's bottom-right corner to scale font and padding together.",
    placement: 'top',
  },
  {
    target: "[data-tour='clip-editor-transcript']",
    title: 'Click a transcript line to jump',
    content:
      'Tap any line in the transcript and the preview seeks to that moment. Useful for fast review.',
    placement: 'top',
  },
];

export function ClipEditorTour() {
  const [replayKey, setReplayKey] = useState(0);
  return (
    <>
      <FeatureTour
        tourId="clip-editor-v1"
        steps={STEPS}
        forceShow={replayKey > 0}
        onClose={() => setReplayKey(0)}
      />
      <TourReplayPill
        onClick={() => setReplayKey((k) => k + 1)}
        label="Replay clip tour"
      />
    </>
  );
}
