import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Stage } from './Stage';
import type { HomeSuggestion } from '@/lib/just-echo-client';

type Props = Parameters<typeof Stage>[0];

function Harness(over: Partial<Props> & { initialDraft?: string }) {
  const [draft, setDraft] = useState(over.initialDraft ?? '');
  const props: Props = {
    mode: 'new',
    firstName: 'Ara',
    suggestions: [],
    items: [],
    sending: false,
    notFound: false,
    draft,
    setDraft,
    onSend: vi.fn(),
    onOpenPanel: vi.fn(),
    onConfirm: vi.fn(),
    confirmingId: null,
    onNew: vi.fn(),
    ...over,
  };
  return <Stage {...props} />;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 10, 27, 9, 0));
});
afterEach(() => vi.useRealTimers());

describe('Stage', () => {
  it('greets by part of day and first name', () => {
    const { unmount } = render(<Harness />);
    expect(screen.getByText('Morning, Ara.')).toBeInTheDocument();
    expect(screen.getByText('What should we make?')).toBeInTheDocument();
    unmount();
    vi.setSystemTime(new Date(2026, 10, 27, 14, 0));
    const r2 = render(<Harness firstName={null} />);
    expect(screen.getByText('Afternoon.')).toBeInTheDocument();
    r2.unmount();
    vi.setSystemTime(new Date(2026, 10, 27, 20, 0));
    render(<Harness />);
    expect(screen.getByText('Evening, Ara.')).toBeInTheDocument();
  });

  it('renders only real suggestions', () => {
    render(<Harness suggestions={[]} />);
    expect(screen.queryByRole('button', { name: /Fill today|Clip this video|Write my take/ })).toBeNull();
    expect(screen.queryByTestId('suggestion-tiles')).toBeNull();
  });

  it('radar tile fills the box without sending', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSend = vi.fn();
    const suggestions: HomeSuggestion[] = [{ kind: 'radar_pick', label: 'Rates are falling' }];
    render(<Harness suggestions={suggestions} onSend={onSend} />);
    await user.click(screen.getByRole('button', { name: /Write my take/ }));
    const box = screen.getByPlaceholderText('Paste a link or tell Echo what to make...') as HTMLTextAreaElement;
    expect(box.value).toBe('Write my take on "Rates are falling". My angle: ');
    expect(document.activeElement).toBe(box);
    expect(onSend).not.toHaveBeenCalled();
  });

  it('open_day and unclipped tiles open their panels', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onOpenPanel = vi.fn();
    const suggestions: HomeSuggestion[] = [
      { kind: 'open_day', label: 'Thursday is open' },
      { kind: 'unclipped_video', label: 'Open house tour', id: 'v1' },
    ];
    render(<Harness suggestions={suggestions} onOpenPanel={onOpenPanel} />);
    await user.click(screen.getByRole('button', { name: /Fill today/ }));
    expect(onOpenPanel).toHaveBeenLastCalledWith({ kind: 'calendar' });
    await user.click(screen.getByRole('button', { name: /Clip this video/ }));
    expect(onOpenPanel).toHaveBeenLastCalledWith({ kind: 'clips', id: 'v1' });
  });

  it('thread mode shows the not-available state with a New button', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onNew = vi.fn();
    render(<Harness mode="thread" notFound onNew={onNew} />);
    expect(screen.getByText('This conversation is not available.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Steer it...')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'New conversation' }));
    expect(onNew).toHaveBeenCalled();
  });

  it('thread mode docks the box', () => {
    render(<Harness mode="thread" />);
    expect(screen.getByPlaceholderText('Steer it...')).toBeInTheDocument();
  });
});
