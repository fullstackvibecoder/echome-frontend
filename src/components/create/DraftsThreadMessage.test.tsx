import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftsThreadMessage } from './DraftsThreadMessage';
import { api } from '@/lib/api-client';
import type { DraftProposal } from '@/types';

vi.mock('@/lib/api-client', () => ({
  api: { drafts: { list: vi.fn() } },
}));

vi.mock('@/components/dashboard/DraftCard', () => ({
  DraftCard: ({ draft, onDismissed }: { draft: DraftProposal; onDismissed: (id: string) => void }) => (
    <div data-testid="draft-card">
      <span>{draft.id}</span>
      <button onClick={() => onDismissed(draft.id)}>dismiss</button>
    </div>
  ),
}));

const listMock = vi.mocked(api.drafts.list);

function makeDraft(id: string): DraftProposal {
  return {
    id,
    title: `Draft ${id}`,
    created_at: '2026-06-13T00:00:00Z',
    origin: 'autonomous',
    content_linkedin: 'LinkedIn content',
    content_instagram: 'Instagram content',
    content_twitter: 'Twitter content',
  };
}

describe('DraftsThreadMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('(a) renders nothing while loading', () => {
    // Never resolves - simulates loading state
    listMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<DraftsThreadMessage />);

    expect(container.querySelector('#drafts')).toBeNull();
    expect(screen.queryByText(/I drafted/)).toBeNull();
  });

  it('(a) renders nothing when API returns empty array', async () => {
    listMock.mockResolvedValue([]);
    const { container } = render(<DraftsThreadMessage />);

    await waitFor(() => {
      expect(container.querySelector('#drafts')).toBeNull();
    });
    expect(screen.queryByText(/I drafted/)).toBeNull();
  });

  it('(b) shows message + drafts section when 2 drafts resolve', async () => {
    const drafts = [makeDraft('draft-1'), makeDraft('draft-2')];
    listMock.mockResolvedValue(drafts);

    const { container } = render(<DraftsThreadMessage />);

    await waitFor(() => {
      expect(screen.getByText('I drafted 2 things for you while you were away. Take a look.')).toBeInTheDocument();
    });

    const section = container.querySelector('#drafts');
    expect(section).not.toBeNull();
    expect(section).toHaveClass('scroll-mt-20');
    expect(section).toHaveAttribute('aria-label', 'Drafted for you');

    const cards = screen.getAllByTestId('draft-card');
    expect(cards).toHaveLength(2);
  });

  it('(c) uses singular noun when 1 draft resolves', async () => {
    listMock.mockResolvedValue([makeDraft('draft-1')]);

    render(<DraftsThreadMessage />);

    await waitFor(() => {
      expect(screen.getByText('I drafted 1 thing for you while you were away. Take a look.')).toBeInTheDocument();
    });
  });

  it('(d) dismissing a card removes it; dismissing the last card hides the section', async () => {
    const drafts = [makeDraft('draft-1'), makeDraft('draft-2')];
    listMock.mockResolvedValue(drafts);

    const { container } = render(<DraftsThreadMessage />);

    await waitFor(() => {
      expect(screen.getAllByTestId('draft-card')).toHaveLength(2);
    });

    // Dismiss the first card
    const dismissButtons = screen.getAllByRole('button', { name: 'dismiss' });
    await userEvent.click(dismissButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByTestId('draft-card')).toHaveLength(1);
    });
    expect(container.querySelector('#drafts')).not.toBeNull();

    // Dismiss the last card
    const remainingDismiss = screen.getByRole('button', { name: 'dismiss' });
    await userEvent.click(remainingDismiss);

    await waitFor(() => {
      expect(container.querySelector('#drafts')).toBeNull();
    });
    expect(screen.queryByText(/I drafted/)).toBeNull();
  });
});
