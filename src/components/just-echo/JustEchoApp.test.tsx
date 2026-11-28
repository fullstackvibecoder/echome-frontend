import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const replace = vi.fn();
let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => params,
  usePathname: () => '/app',
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Ana Lee', email: 'ana@x.com' }, logout: vi.fn() }),
}));
vi.mock('@/hooks/useThemePref', () => ({ useThemePref: vi.fn(() => ({ pref: 'system', resolved: 'light', setPref: vi.fn() })) }));
vi.mock('@/components/ds/ThemeSwitch', () => ({ ThemeSwitch: () => <div data-testid="theme" /> }));
vi.mock('@/lib/api-client', () => ({
  default: {
    contentKits: { list: () => Promise.resolve({ data: { kits: [] } }) },
    clips: { list: () => Promise.resolve({ data: { uploads: [] } }) },
  },
}));

type ConvOpts = {
  conversationId: string | null;
  panel: unknown;
  onCreated: (id: string) => void;
  onPanel: (t: unknown) => void;
};
let lastOpts: ConvOpts | null = null;
let convState = { items: [] as unknown[], loading: false, sending: false, notFound: false, confirmingId: null as string | null };
const send = vi.fn();
vi.mock('@/hooks/just-echo/useConversation', () => ({
  useConversation: (o: ConvOpts) => {
    lastOpts = o;
    return { ...convState, send: (t: string) => { send(t); o.onCreated('11111111-1111-4111-8111-111111111111'); return Promise.resolve(); }, confirm: vi.fn() };
  },
}));
vi.mock('@/hooks/just-echo/useConversationList', () => ({
  useConversationList: () => ({ conversations: [], loading: false, error: false, refresh: vi.fn(), setTitle: vi.fn() }),
}));
vi.mock('@/hooks/just-echo/useHomeData', () => ({
  useHomeData: () => ({
    data: { justEcho: true, week: null, nextUp: null, ready: { items: [] }, knowledge: null, suggestions: [] },
    loading: false,
    error: false,
    refresh: vi.fn(),
  }),
}));

import { JustEchoApp } from './JustEchoApp';

const UUID = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  replace.mockReset();
  send.mockReset();
  params = new URLSearchParams();
  lastOpts = null;
  convState = { items: [], loading: false, sending: false, notFound: false, confirmingId: null };
});

describe('JustEchoApp', () => {
  it('renders the new-conversation stage with no c param', () => {
    render(<JustEchoApp />);
    expect(screen.getByText('What should we make?')).toBeInTheDocument();
    expect(lastOpts?.conversationId).toBeNull();
  });

  it('opens a thread from ?c= and a panel from ?open=kit:abc', () => {
    params = new URLSearchParams(`c=${UUID}&open=kit:abc`);
    render(<JustEchoApp />);
    expect(lastOpts?.conversationId).toBe(UUID);
    expect(lastOpts?.panel).toEqual({ kind: 'kit', id: 'abc' });
    expect(screen.queryByText('What should we make?')).toBeNull();
    expect(screen.getByRole('region', { name: 'Kit' })).toBeInTheDocument();
  });

  it('renders the not-available state for ?c= that 404s', () => {
    params = new URLSearchParams(`c=${UUID}`);
    convState.notFound = true;
    const { unmount } = render(<JustEchoApp />);
    expect(screen.getByText('This conversation is not available.')).toBeInTheDocument();
    unmount();
    params = new URLSearchParams('c=garbage');
    convState.notFound = false;
    render(<JustEchoApp />);
    expect(lastOpts?.conversationId).toBeNull();
    expect(screen.getByText('This conversation is not available.')).toBeInTheDocument();
  });

  it('sending from the new stage sets ?c= to the created id', async () => {
    const user = userEvent.setup();
    render(<JustEchoApp />);
    await user.type(screen.getByRole('textbox'), 'hello{Enter}');
    expect(send).toHaveBeenCalledWith('hello');
    expect(replace).toHaveBeenCalledWith('/app?c=11111111-1111-4111-8111-111111111111', { scroll: false });
  });

  it('opening a receipt panel replaces the default side and closing restores it', async () => {
    const user = userEvent.setup();
    params = new URLSearchParams(`c=${UUID}`);
    const { container } = render(<JustEchoApp />);
    const sideBefore = container.querySelector('[data-side]')!;
    expect(within(sideBefore as HTMLElement).queryByRole('region', { name: 'Kit' })).toBeNull();
    act(() => lastOpts!.onPanel({ kind: 'kit', id: 'abc' }));
    expect(screen.getByRole('region', { name: 'Kit' })).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith(`/app?c=${UUID}&open=kit%3Aabc`, { scroll: false });
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region', { name: 'Kit' })).toBeNull();
    expect(replace).toHaveBeenLastCalledWith(`/app?c=${UUID}`, { scroll: false });
  });

  it('Cmd+K opens search and Escape closes it', async () => {
    const user = userEvent.setup();
    render(<JustEchoApp />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.keyboard('{Meta>}k{/Meta}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('exactly one .je element in the tree', () => {
    const { container } = render(<JustEchoApp />);
    expect(container.querySelectorAll('.je')).toHaveLength(1);
  });

  it('a panel event right after the conversation is created keeps ?c=', () => {
    render(<JustEchoApp />);
    act(() => {
      lastOpts!.onCreated('abc-id');
      lastOpts!.onPanel({ kind: 'voice' });
    });
    const url = replace.mock.calls[replace.mock.calls.length - 1][0] as string;
    expect(url).toContain('c=abc-id');
    expect(url).toContain('open=voice');
  });

  it('Escape closes the open panel', async () => {
    const user = userEvent.setup();
    params = new URLSearchParams(`c=${UUID}&open=voice`);
    render(<JustEchoApp />);
    expect(screen.getByRole('region', { name: 'Your voice' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Your voice' })).toBeNull();
    expect(replace).toHaveBeenLastCalledWith(`/app?c=${UUID}`, { scroll: false });
  });

  it('Escape while Cmd+K is open closes only the search', async () => {
    const user = userEvent.setup();
    params = new URLSearchParams(`c=${UUID}&open=voice`);
    render(<JustEchoApp />);
    await user.keyboard('{Meta>}k{/Meta}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region', { name: 'Your voice' })).toBeInTheDocument();
  });
});
