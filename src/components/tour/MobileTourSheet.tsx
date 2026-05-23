'use client';

/**
 * MobileTourSheet
 *
 * Bottom-sheet variant of FeatureTour for viewports <768px. Renders the same
 * Step[] array but as a fixed-bottom sheet rather than a driver.js popover.
 *
 * Behavior:
 *  - Sheet covers bottom 45vh; upper content dimmed at 35% opacity.
 *  - Tap grabber, tap-outside, or tap "Skip" all close → onClose() (which marks seen).
 *  - "Got it" on the last step closes the same way.
 *
 * See docs/superpowers/specs/2026-05-23-guided-tour-system-design.md §5.2.
 */
import { useState } from 'react';

export interface TourStep {
  /** CSS selector for the anchor element (used by desktop driver.js). Ignored on mobile. */
  target: string;
  title: string;
  content: string;
  /** Popover placement hint for the desktop driver.js side. Ignored on mobile. */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface Props {
  steps: TourStep[];
  onClose: () => void;
}

export function MobileTourSheet({ steps, onClose }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  if (!step) {
    onClose();
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/35 z-[9000] md:hidden"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[9001] bg-card border-t border-border rounded-t-2xl shadow-2xl px-4 pt-3 pb-5 md:hidden"
        style={{ maxHeight: '45vh' }}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tour"
          className="block w-9 h-1 bg-border rounded-full mx-auto mb-3 hover:bg-foreground/30 transition-colors"
        />

        <div className="flex justify-between items-center mb-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Step {stepIndex + 1} of {steps.length}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
        </div>

        <div className="text-[15px] font-semibold text-foreground mb-1.5">
          {step.title}
        </div>

        <div className="text-[13px] text-muted-foreground leading-relaxed mb-4">
          {step.content}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" role="presentation">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i === stepIndex ? 'bg-accent' : 'bg-border'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (isLast ? onClose() : setStepIndex((s) => s + 1))}
            className="bg-accent text-accent-foreground px-4 py-1.5 rounded-lg text-[13px] font-semibold"
          >
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}
