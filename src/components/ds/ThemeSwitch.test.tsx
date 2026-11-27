import { act, render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeSwitch } from './ThemeSwitch';
import { cx } from './cx';

type Listener = (e: { matches: boolean }) => void;

function installFakeMatchMedia(initialDark = false) {
  const original = window.matchMedia;
  const listeners = new Set<Listener>();
  const state = { matches: initialDark };
  const mql = {
    get matches() {
      return state.matches;
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_t: string, l: Listener) => listeners.add(l),
    removeEventListener: (_t: string, l: Listener) => listeners.delete(l),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
  Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: () => mql });
  return {
    listeners,
    fire(matches: boolean) {
      state.matches = matches;
      act(() => listeners.forEach((l) => l({ matches })));
    },
    restore() {
      Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: original });
    },
  };
}

describe('cx', () => {
  it('joins truthy parts', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
  });
});

describe('ThemeSwitch', () => {
  let mm: ReturnType<typeof installFakeMatchMedia>;
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    mm = installFakeMatchMedia(false);
  });
  afterEach(() => {
    cleanup();
    mm.restore();
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('renders a Theme radiogroup with Auto checked by default', () => {
    render(<ThemeSwitch />);
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.getAttribute('aria-label'))).toEqual(['Auto', 'Light', 'Dark']);
    expect(screen.getByRole('radio', { name: 'Auto' })).toHaveAttribute('aria-checked', 'true');
  });

  it('reflects a stored light preference after mount', () => {
    window.localStorage.setItem('echome-theme', 'light');
    render(<ThemeSwitch />);
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');
  });

  it('clicking Dark stores and applies it', async () => {
    render(<ThemeSwitch />);
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(window.localStorage.getItem('echome-theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  });

  it('clicking Auto after Dark removes the stored key', async () => {
    render(<ThemeSwitch />);
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Auto' }));
    expect(window.localStorage.getItem('echome-theme')).toBeNull();
  });

  it('follows system changes while Auto', () => {
    render(<ThemeSwitch />);
    mm.fire(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('ignores system changes while Light', async () => {
    render(<ThemeSwitch />);
    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(mm.listeners.size).toBe(0);
    mm.fire(true);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('removes the listener on unmount', () => {
    const { unmount } = render(<ThemeSwitch />);
    expect(mm.listeners.size).toBe(1);
    unmount();
    expect(mm.listeners.size).toBe(0);
  });

  it('ArrowRight from Auto checks Light', async () => {
    render(<ThemeSwitch />);
    screen.getByRole('radio', { name: 'Auto' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');
  });
});
