import { describe, it, expect } from 'vitest';
import { isBundleStale, shouldCheckNow, markBusy, isBusy } from './deploy-version';

describe('isBundleStale', () => {
  it('is stale when the server runs a different commit', () => {
    expect(isBundleStale('abc123', 'def456')).toBe(true);
  });

  it.each([
    ['abc123', 'abc123'],
    ['dev', 'def456'],
    ['abc123', 'dev'],
    ['', 'def456'],
    ['abc123', undefined],
    ['abc123', 42],
    [undefined, 'def456'],
  ])('is not stale for (%s, %s)', (bundle, server) => {
    expect(isBundleStale(bundle, server)).toBe(false);
  });
});

describe('shouldCheckNow', () => {
  it('always allows the first check', () => {
    expect(shouldCheckNow(0, 1000, 60_000)).toBe(true);
  });

  it('throttles inside the interval and allows after it', () => {
    expect(shouldCheckNow(1000, 30_000, 60_000)).toBe(false);
    expect(shouldCheckNow(1000, 61_000, 60_000)).toBe(true);
  });
});

describe('markBusy', () => {
  it('stays busy until every holder releases, and double release is harmless', () => {
    expect(isBusy()).toBe(false);
    const a = markBusy();
    const b = markBusy();
    a();
    a();
    expect(isBusy()).toBe(true);
    b();
    expect(isBusy()).toBe(false);
  });
});
