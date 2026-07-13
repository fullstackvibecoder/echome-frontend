import { describe, it, expect, vi, beforeEach } from 'vitest';
import { installConsoleBuffer, getRecentErrors, __resetConsoleBuffer } from './console-buffer';

beforeEach(() => __resetConsoleBuffer());

describe('console-buffer', () => {
  it('captures console.error and still calls the original', () => {
    const orig = vi.spyOn(console, 'error').mockImplementation(() => {});
    installConsoleBuffer();
    console.error('boom', 42);
    expect(getRecentErrors().at(-1)?.message).toContain('boom');
    expect(orig).toHaveBeenCalled();
  });

  it('caps at 5 entries, newest last', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    installConsoleBuffer();
    for (let i = 0; i < 7; i++) console.error('e' + i);
    const errs = getRecentErrors();
    expect(errs).toHaveLength(5);
    expect(errs[0].message).toContain('e2');
    expect(errs.at(-1)?.message).toContain('e6');
  });

  it('installConsoleBuffer is idempotent', () => {
    const orig = vi.spyOn(console, 'error').mockImplementation(() => {});
    installConsoleBuffer();
    installConsoleBuffer();
    console.error('once');
    // Wrapped exactly once -> exactly one buffer entry, original called once.
    expect(getRecentErrors()).toHaveLength(1);
    expect(orig).toHaveBeenCalledTimes(1);
  });
});
