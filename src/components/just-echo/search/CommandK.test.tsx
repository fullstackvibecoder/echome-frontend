import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const kitsList = vi.fn();
const clipsList = vi.fn();
vi.mock('@/lib/api-client', () => ({
  default: {
    contentKits: { list: (...a: unknown[]) => kitsList(...a) },
    clips: { list: (...a: unknown[]) => clipsList(...a) },
  },
}));

import { CommandK } from './CommandK';
import type { ConversationSummary } from '@/lib/just-echo-client';

const conv = (id: string, title: string): ConversationSummary => ({
  id,
  title,
  updatedAt: '2026-11-27T00:00:00Z',
  thumbnailUrl: null,
  jobRunning: false,
});
const conversations = [conv('c1', 'Spring listing'), conv('c2', 'Radar take')];

function setup(over: Partial<Parameters<typeof CommandK>[0]> = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    conversations,
    onPickConversation: vi.fn(),
    onOpenPanel: vi.fn(),
    ...over,
  };
  render(<CommandK {...props} />);
  return props;
}

beforeEach(() => {
  kitsList.mockReset();
  clipsList.mockReset();
  kitsList.mockResolvedValue({ data: { kits: [{ id: 'k1', title: 'Spring kit' }] } });
  clipsList.mockResolvedValue({ data: { uploads: [{ id: 'v1', originalFilename: 'spring-tour.mp4' }, { id: 'v2' }] } });
});

describe('CommandK', () => {
  it('CommandK keyboard navigation picks the active result', async () => {
    const user = userEvent.setup();
    const p = setup();
    const input = screen.getByRole('textbox', { name: 'Search conversations, kits and videos' });
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(kitsList).toHaveBeenCalledWith(100));
    expect(clipsList).toHaveBeenCalledWith(50);
    await user.type(input, 'spring');
    await screen.findByRole('option', { name: /Spring kit/ });
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Spring listing')]));
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id);
    await user.keyboard('{Enter}');
    expect(p.onOpenPanel).toHaveBeenCalledWith({ kind: 'kit', id: 'k1' });
    expect(p.onClose).toHaveBeenCalled();
  });

  it('picks a conversation and a video, Escape closes', async () => {
    const user = userEvent.setup();
    const p = setup();
    const input = screen.getByRole('textbox', { name: 'Search conversations, kits and videos' });
    await user.keyboard('{Enter}');
    expect(p.onPickConversation).toHaveBeenCalledWith('c1');
    await user.clear(input);
    await user.type(input, 'tour');
    await user.click(await screen.findByRole('option', { name: /spring-tour\.mp4/ }));
    expect(p.onOpenPanel).toHaveBeenCalledWith({ kind: 'clips', id: 'v1' });
    await user.keyboard('{Escape}');
    expect(p.onClose).toHaveBeenCalled();
  });

  it('CommandK still searches conversations when the kits call fails', async () => {
    const user = userEvent.setup();
    kitsList.mockRejectedValue(new Error('boom'));
    setup();
    const input = screen.getByRole('textbox', { name: 'Search conversations, kits and videos' });
    await waitFor(() => expect(clipsList).toHaveBeenCalled());
    await user.type(input, 'radar');
    expect(await screen.findByRole('option', { name: /Radar take/ })).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, 'untitled');
    expect(await screen.findByRole('option', { name: /Untitled video/ })).toBeInTheDocument();
  });

  it('renders nothing and loads nothing while closed', () => {
    setup({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(kitsList).not.toHaveBeenCalled();
  });
});
