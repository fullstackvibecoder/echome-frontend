import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Thread } from './Thread';
import type { ThreadItem } from './thread-model';

const future = () => Math.floor(Date.now() / 1000) + 600;
const past = () => Math.floor(Date.now() / 1000) - 600;

function confirm(over: Partial<Extract<ThreadItem, { kind: 'confirm' }>> = {}): ThreadItem {
  return { kind: 'confirm', key: 'c1', messageId: 'm1', tool: 'post_now', preview: 'Post this now', expiresAt: future(), state: 'pending', ...over };
}

const noop = () => {};
const all = (): ThreadItem[] => [
  { kind: 'user', key: 'u', text: 'Hi there' },
  { kind: 'echo', key: 'e', text: 'Hello, see /app/billing' },
  { kind: 'working', key: 'w', label: 'Reading your kit' },
  { kind: 'receipt', key: 'r', verb: 'FETCHED VOICE RULES', label: 'Voice', panel: { kind: 'voice' } },
  confirm(),
  { kind: 'upgrade', key: 'up', message: 'Upgrade to continue' },
  { kind: 'job', key: 'j1', label: 'Clips', state: 'ready', panel: { kind: 'clips' } },
  { kind: 'job', key: 'j2', label: 'Carousel', state: 'failed' },
  { kind: 'error', key: 'er', message: 'Something broke' },
];

function renderThread(items: ThreadItem[], props: Partial<Parameters<typeof Thread>[0]> = {}) {
  return render(<Thread items={items} onOpenPanel={noop} onConfirm={noop} confirmingId={null} {...props} />);
}

afterEach(() => vi.useRealTimers());

describe('Thread', () => {
  it('renders each item kind with its copy', () => {
    renderThread(all());
    expect(screen.getByRole('log').getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('Hi there')).toBeTruthy();
    expect(screen.getByText('Reading your kit')).toBeTruthy();
    expect(screen.getByText('Fetched voice rules')).toBeTruthy();
    expect(screen.getByText('Post this now')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByText('Upgrade to continue')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'See plans' }).getAttribute('href')).toBe('/app/billing');
    expect(screen.getByText('Clips is ready')).toBeTruthy();
    expect(screen.getByText('Carousel did not finish')).toBeTruthy();
    expect(screen.getByText('Something broke')).toBeTruthy();
    expect(screen.getByRole('link', { name: '/app/billing' })).toBeTruthy();
  });

  it('shows the status line for non-pending confirm states', () => {
    const lines: Record<string, string> = {
      running: 'Working on it.',
      confirmed: 'Done.',
      cancelled: 'Cancelled.',
      expired: 'Expired. Ask Echo again.',
      failed: 'That did not go through.',
    };
    for (const [state, line] of Object.entries(lines)) {
      const { unmount } = renderThread([confirm({ state: state as never })]);
      expect(screen.getByText(line)).toBeTruthy();
      expect(screen.queryByRole('button')).toBeNull();
      unmount();
    }
  });

  it('ConfirmRow disables both buttons while resolving', () => {
    const onConfirm = vi.fn();
    renderThread([confirm()], { confirmingId: 'm1', onConfirm });
    const c = screen.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement;
    const x = screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement;
    expect(c.disabled).toBe(true);
    expect(x.disabled).toBe(true);
    fireEvent.click(c);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm with approval flag', () => {
    const onConfirm = vi.fn();
    renderThread([confirm()], { onConfirm });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).toHaveBeenNthCalledWith(1, 'm1', true);
    expect(onConfirm).toHaveBeenNthCalledWith(2, 'm1', false);
  });

  it('an expired pending confirm shows the expired line and no buttons', () => {
    renderThread([confirm({ expiresAt: past() })]);
    expect(screen.getByText('Expired. Ask Echo again.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('Open on a receipt calls onOpenPanel with its target', () => {
    const onOpenPanel = vi.fn();
    renderThread([{ kind: 'receipt', key: 'r', verb: 'FETCHED', label: 'x', panel: { kind: 'kit', id: 'k1' } }], { onOpenPanel });
    fireEvent.click(screen.getByRole('button', { name: /open/i }));
    expect(onOpenPanel).toHaveBeenCalledWith({ kind: 'kit', id: 'k1' });
  });

  it('autoscrolls on growth only when near the bottom', () => {
    const items = [{ kind: 'user', key: 'a', text: 'a' }] as ThreadItem[];
    const { rerender } = renderThread(items);
    const log = screen.getByRole('log');
    let top = 0;
    Object.defineProperty(log, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(log, 'clientHeight', { configurable: true, value: 400 });
    Object.defineProperty(log, 'scrollTop', { configurable: true, get: () => top, set: (v) => { top = v; } });
    const more = [...items, { kind: 'user', key: 'b', text: 'b' }] as ThreadItem[];

    top = 500; // 100px from bottom: stay
    fireEvent.scroll(log);
    rerender(<Thread items={more} onOpenPanel={noop} onConfirm={noop} confirmingId={null} />);
    expect(top).toBe(500);

    top = 540; // 60px from bottom: follow
    fireEvent.scroll(log);
    const even = [...more, { kind: 'user', key: 'c', text: 'c' }] as ThreadItem[];
    rerender(<Thread items={even} onOpenPanel={noop} onConfirm={noop} confirmingId={null} />);
    expect(top).toBe(1000);
  });

  it('no em dashes in rendered copy', () => {
    const { container } = renderThread([...all(), confirm({ key: 'x', expiresAt: past() })]);
    expect(container.textContent).not.toMatch(/[—–]/);
  });
});
