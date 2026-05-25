'use client';

/**
 * Carousel editor tour — v2.
 *
 * Mounts inside CarouselEditorModal; fires 500ms after the modal opens,
 * exactly once per user (tour id: carousel-editor-v2).
 * v2 bumped 2026-05-25 after restoring upload-your-own in PhotoPicker.
 *
 * Anchors live on:
 *   - carousel-editor-text       Right-pane text-editing wrapper
 *   - carousel-editor-photo      PhotoPicker mount point
 *   - carousel-editor-filmstrip  Filmstrip wrapper (reorder/add/delete)
 *
 * Versioning: bump tourId when filmstrip affordances or
 * structured-field shape change meaningfully.
 *
 * See docs/superpowers/specs/2026-05-23-guided-tour-system-design.md §9.2.
 */
import { useState } from 'react';
import type { TourStep } from '../MobileTourSheet';
import { FeatureTour } from '../FeatureTour';
import { TourReplayPill } from '../TourReplayPill';

const STEPS: TourStep[] = [
  {
    target: "[data-tour='carousel-editor-text']",
    title: "Edit any slide's text here",
    content:
      'Cover, body, CTA — each field is editable. Changes save automatically and re-render the preview.',
    placement: 'left',
  },
  {
    target: "[data-tour='carousel-editor-photo']",
    title: 'Swap the photo on cover / last slides',
    content:
      'Pick a frame from your uploaded video, use your profile photo, or upload your own image. Body slides keep the template look.',
    placement: 'left',
  },
  {
    target: "[data-tour='carousel-editor-filmstrip']",
    title: 'Reorder, add, or remove slides',
    content:
      'Drag any thumbnail to reorder. Click + to insert a slide. Hover and tap ✕ to delete.',
    placement: 'top',
  },
];

export function CarouselEditorTour() {
  const [replayKey, setReplayKey] = useState(0);
  return (
    <>
      <FeatureTour
        tourId="carousel-editor-v2"
        steps={STEPS}
        forceShow={replayKey > 0}
        onClose={() => setReplayKey(0)}
      />
      <TourReplayPill
        onClick={() => setReplayKey((k) => k + 1)}
        label="Replay carousel tour"
      />
    </>
  );
}
