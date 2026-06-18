/// <reference types="vitest/globals" />
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// Stub Supabase env so any module that transitively imports src/lib/supabase
// (e.g. api-client via useVoiceStrength via VoiceLearningChip in EchoHero) can
// eval without throwing "Supabase environment variables not configured". This
// whole setup file runs before any test module loads, so the stubs are set
// before supabase.ts captures them at eval time. No network is made:
// createClient only constructs and onAuthStateChange registers a local
// listener. Tests needing real Supabase behavior should mock it explicitly.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://stub.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'stub-anon-key';

// jsdom does not implement window.matchMedia. Components using a useMediaQuery
// hook (e.g. EchoHero's desktop/mobile viewport switch) call it on mount and
// crash without this. Returns a no-match stub with both the modern
// (add/removeEventListener) and legacy (add/removeListener) listener APIs.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom does not implement IntersectionObserver. Components using AnimatedSection
// (which calls useScrollAnimation → new IntersectionObserver) crash without this.
// Stub it with a no-op that never fires the callback, so the component renders
// without animation but without errors.
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserverStub,
  });
}

// Tear down mounted React trees before the next test's beforeEach hooks run.
beforeEach(() => {
  cleanup();
});

// Reset all mocks after each test. This prevents a vitest quirk where
// mockReset() returns the spy itself, vitest treats that return value as a
// cleanup callback, and calling the spy during cleanup (with a rejected
// implementation still active) fires an unhandled rejection.
afterEach(() => {
  vi.resetAllMocks();
});
