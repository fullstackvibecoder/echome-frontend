'use client';

/**
 * FeatureTour
 *
 * First-access guided tour for a feature. Drop one of these on any page;
 * the tour fires exactly once per user per `tourId`. Completing or skipping
 * the tour persists the id into User.preferences.toursSeen via PATCH
 * /api/me/preferences so it never fires again unless the user explicitly
 * reopens via a Help icon (bump `replayNonce`).
 *
 * Uses driver.js (vanilla DOM library) — chosen over react-joyride because
 * Joyride 2.x is incompatible with React 19 (uses removed unmountComponentAtNode).
 *
 * On mobile (<768px) the desktop driver.js popover is replaced with a
 * MobileTourSheet bottom sheet. Same step content, different chrome.
 *
 * See docs/superpowers/specs/2026-05-23-guided-tour-system-design.md §5.
 */
import { useEffect, useRef, useState } from 'react';
import { useTourState } from '@/hooks/useTourState';
import { useTourViewport } from '@/hooks/useTourViewport';
import { MobileTourSheet, type TourStep } from './MobileTourSheet';
import './tour-theme.css';

interface Props {
  tourId: string;
  steps: TourStep[];
  /**
   * Monotonic replay trigger. Starts at 0 (no replay). Increment it (e.g. via
   * the replay help button) to re-fire the tour even if previously seen.
   *
   * A counter, not a boolean, on purpose: every increment is a fresh value in
   * the firing effect's dependency array, so each replay click is guaranteed to
   * re-run the effect. This removes the boolean re-arm bug where a missed reset
   * (ESC/overlay close, double-destroy, unmount before onClose) left a sticky
   * `true` and killed all subsequent replays.
   */
  replayNonce?: number;
  onClose?: () => void;
}

export function FeatureTour({ tourId, steps, replayNonce = 0, onClose }: Props) {
  const { hasSeen, markSeen } = useTourState();
  const viewport = useTourViewport();
  const [run, setRun] = useState(false);
  const seenRef = useRef(hasSeen);
  // Keep latest hasSeen in a ref so the firing useEffect doesn't re-run
  // every time the user-context refreshes (which would reset the 500ms timer).
  useEffect(() => { seenRef.current = hasSeen; }, [hasSeen]);

  useEffect(() => {
    if (replayNonce > 0 || !seenRef.current(tourId)) {
      const t = setTimeout(() => setRun(true), 500);
      return () => clearTimeout(t);
    }
  }, [tourId, replayNonce]);

  const handleClose = () => {
    setRun(false);
    void markSeen(tourId);
    onClose?.();
  };

  if (!run) return null;

  if (viewport === 'mobile') {
    return <MobileTourSheet steps={steps} onClose={handleClose} />;
  }

  return <DesktopDriverTour steps={steps} onClose={handleClose} />;
}

/**
 * Desktop tour shell — instantiates driver.js when mounted and tears down on unmount.
 *
 * driver.js mutates the DOM directly outside React; we use a ref + useEffect
 * to ensure cleanup runs on unmount (which fires our onClose for persistence).
 */
function DesktopDriverTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    // Dynamic import so driver.js never lands in the SSR bundle.
    let cleanup: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      const { driver } = await import('driver.js');
      await import('driver.js/dist/driver.css');
      if (cancelled) return;

      const d = driver({
        showProgress: true,
        allowClose: true,
        overlayOpacity: 0.55,
        popoverClass: 'echome-tour-popover',
        nextBtnText: 'Next',
        prevBtnText: 'Back',
        doneBtnText: 'Got it',
        progressText: '{{current}} of {{total}}',
        onDestroyed: () => onCloseRef.current(),
        steps: steps.map((s) => ({
          element: s.target,
          popover: {
            title: s.title,
            description: s.content,
            side: s.placement === 'left' ? 'left' : s.placement === 'right' ? 'right' : 'top',
          },
        })),
      });
      d.drive();
      cleanup = () => d.destroy();
    })();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [steps]);

  return null;
}
