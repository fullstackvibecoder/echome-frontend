import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_BOOTSTRAP_SCRIPT,
  THEME_STORAGE_KEY,
  applyThemePref,
  readThemePref,
  resolveTheme,
} from './theme';

function stubMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  vi.restoreAllMocks();
  window.matchMedia = originalMatchMedia;
});

describe('resolveTheme', () => {
  it('honours an explicit preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
  it('follows the system for "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('readThemePref', () => {
  it('returns a stored valid value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readThemePref()).toBe('dark');
  });
  it('rejects wrong case and unknown values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'DARK');
    expect(readThemePref()).toBe('system');
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    expect(readThemePref()).toBe('system');
  });
  it('defaults to system when nothing is stored', () => {
    expect(readThemePref()).toBe('system');
  });
  it('defaults to system when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readThemePref()).toBe('system');
  });
});

describe('applyThemePref', () => {
  it('stores and applies an explicit preference', () => {
    expect(applyThemePref('dark')).toBe('dark');
    expect(localStorage.getItem('echome-theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
  it('removes the key for system and follows matchMedia', () => {
    localStorage.setItem('echome-theme', 'light');
    stubMatchMedia(true);
    expect(applyThemePref('system')).toBe('dark');
    expect(localStorage.getItem('echome-theme')).toBeNull();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
  it('still sets the attribute when storage writes throw', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(applyThemePref('light')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

describe('THEME_BOOTSTRAP_SCRIPT', () => {
  it('applies a stored preference', () => {
    localStorage.setItem('echome-theme', 'dark');
    new Function(THEME_BOOTSTRAP_SCRIPT)();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
  it('follows the system when nothing is stored', () => {
    stubMatchMedia(true);
    new Function(THEME_BOOTSTRAP_SCRIPT)();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
  it('falls back to light when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    new Function(THEME_BOOTSTRAP_SCRIPT)();
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
