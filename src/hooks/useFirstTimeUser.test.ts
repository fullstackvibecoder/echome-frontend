import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useFirstTimeUser } from './useFirstTimeUser';

describe('useFirstTimeUser', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exposes only isFirstTime and dismissWelcome', () => {
    const { result } = renderHook(() => useFirstTimeUser());
    expect(Object.keys(result.current).sort()).toEqual(['dismissWelcome', 'isFirstTime']);
  });

  it('is first time until dismissed, and persists dismissal', () => {
    const { result } = renderHook(() => useFirstTimeUser());
    expect(result.current.isFirstTime).toBe(true);
    act(() => result.current.dismissWelcome());
    expect(result.current.isFirstTime).toBe(false);
    expect(localStorage.getItem('echome_welcome_dismissed')).toBeTruthy();
  });

  it('never touches the legacy sidebar hints key', () => {
    localStorage.setItem('echome_sidebar_hints_seen', '{"knowledge":true}');
    renderHook(() => useFirstTimeUser());
    // Key is left alone (not read into state, not rewritten). Sidebar hints are gone.
    expect(localStorage.getItem('echome_sidebar_hints_seen')).toBe('{"knowledge":true}');
  });
});
