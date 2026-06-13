/// <reference types="vitest/globals" />
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

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
