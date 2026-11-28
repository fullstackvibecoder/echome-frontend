import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

let pathname = '/app';
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => params,
}));
let user: { id: string } | null = { id: 'u1' };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user }) }));
let access: 'loading' | 'on' | 'off' = 'on';
const accessSpy = vi.fn();
vi.mock('@/hooks/just-echo/useJustEchoAccess', () => ({
  useJustEchoAccess: (id: string | null) => { accessSpy(id); return id ? access : 'off'; },
}));
vi.mock('next/dynamic', () => ({
  default: () => function Stub() { return <div data-testid="je-app" />; },
}));

import { ShellSwitch } from './ShellSwitch';

const classic = <div data-testid="classic" />;

describe('ShellSwitch', () => {
  beforeEach(() => {
    pathname = '/app';
    params = new URLSearchParams();
    user = { id: 'u1' };
    access = 'on';
    accessSpy.mockClear();
  });

  it('renders JustEchoApp on /app when on', () => {
    render(<ShellSwitch>{classic}</ShellSwitch>);
    expect(screen.getByTestId('je-app')).toBeInTheDocument();
    expect(screen.queryByTestId('classic')).toBeNull();
  });

  it('renders JustEchoApp with only c and open params', () => {
    params = new URLSearchParams('c=abc&open=kit');
    render(<ShellSwitch>{classic}</ShellSwitch>);
    expect(screen.getByTestId('je-app')).toBeInTheDocument();
  });

  it('renders the classic children on /app/library even when on', () => {
    pathname = '/app/library';
    render(<ShellSwitch>{classic}</ShellSwitch>);
    expect(screen.getByTestId('classic')).toBeInTheDocument();
    expect(screen.queryByTestId('je-app')).toBeNull();
  });

  it('renders classic for /app?classic=1', () => {
    params = new URLSearchParams('classic=1');
    render(<ShellSwitch>{classic}</ShellSwitch>);
    expect(screen.getByTestId('classic')).toBeInTheDocument();
  });

  it('renders classic when /app carries a classic deep link param', () => {
    for (const q of ['transfer=claude', 'topic=x', 'echoFile=1', 'c=abc&echoPrompt=hi']) {
      params = new URLSearchParams(q);
      const { unmount } = render(<ShellSwitch>{classic}</ShellSwitch>);
      expect(screen.getByTestId('classic')).toBeInTheDocument();
      expect(screen.queryByTestId('je-app')).toBeNull();
      unmount();
    }
  });

  it('tracking params do not force classic', () => {
    for (const q of ['utm_source=email&utm_campaign=x', 'fbclid=1', 'gclid=2', 'ref=nl', 'c=abc&utm_medium=email']) {
      params = new URLSearchParams(q);
      const { unmount } = render(<ShellSwitch>{classic}</ShellSwitch>);
      expect(screen.getByTestId('je-app')).toBeInTheDocument();
      unmount();
    }
  });

  it('renders classic when access is off', () => {
    access = 'off';
    render(<ShellSwitch>{classic}</ShellSwitch>);
    expect(screen.getByTestId('classic')).toBeInTheDocument();
  });

  it('shows a neutral canvas while loading on /app, never classic', () => {
    access = 'loading';
    const { container } = render(<ShellSwitch>{classic}</ShellSwitch>);
    expect(screen.queryByTestId('classic')).toBeNull();
    const el = container.querySelector('.je.je-canvas');
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe('');
  });

  it('shows classic while loading on other paths or deep links', () => {
    access = 'loading';
    pathname = '/app/library';
    const a = render(<ShellSwitch>{classic}</ShellSwitch>);
    expect(screen.getByTestId('classic')).toBeInTheDocument();
    a.unmount();
    pathname = '/app';
    params = new URLSearchParams('transfer=claude');
    render(<ShellSwitch>{classic}</ShellSwitch>);
    expect(screen.getByTestId('classic')).toBeInTheDocument();
  });

  it('never calls the access endpoint without a user', () => {
    user = null;
    render(<ShellSwitch>{classic}</ShellSwitch>);
    expect(accessSpy).toHaveBeenCalledWith(null);
    expect(screen.getByTestId('classic')).toBeInTheDocument();
  });
});
