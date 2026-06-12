'use client';

/**
 * Single gate for the Echo experience (Pass 2c). Controls the Home hero, the
 * Voice-page rebuild, intake retirement, and the docked pill. Flipped on for
 * all users 2026-06-12 after the admin soak. Kept as a hook (rather than
 * deleting call sites) for one release so a regression can be rolled back
 * here with one line.
 */
export function useEchoExperience(): boolean {
  return true;
}
