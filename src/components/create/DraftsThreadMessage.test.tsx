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
    <div data-testid="draft-featured">
      <span>{draft.id}</span>
      <button onClick={() => onDismissed(draft.id)}>dismiss-featured</button>
    </div>
  ),
}));

vi.mock('@/components/dashboard/DraftRow', () => ({
  DraftRow: ({ draft, onDismissed }: { draft: DraftProposal; onDismissed: (id: string) => void }) => (
    <div data-testid="draft-row">
      <span>{draft.id}</span>
      <button onClick={() => onDismissed(draft.id)}>dismiss-row</button>
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
    listMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<DraftsThreadMessage />);
    expect(container.querySelector('#drafts')).toBeNull();
    expect(screen.queryByText(/I drafted/)).toBeNull();
  });

  it('(b) renders nothing when API returns empty array', async () => {
    listMock.mockResolvedValue([]);
    const { container } = render(<DraftsThreadMessage />);
    await waitFor(() => {
      expect(container.querySelector('#drafts')).toBeNull();
    });
    expect(screen.queryByText(/I drafted/)).toBeNull();
  });

  it('(c) renders the first draft featured and the rest as rows', async () => {
    listMock.mockResolvedValue([makeDraft('draft-1'), makeDraft('draft-2'), makeDraft('draft-3')]);
    const { container } = render(<DraftsThreadMessage />);

    await waitFor(() => {
      expect(screen.getByText('I drafted 3 things for you while you were away. Take a look.')).toBeInTheDocument();
    });

    const section = container.querySelector('#drafts');
    expect(section).not.toBeNull();
    expect(section).toHaveClass('scroll-mt-20');
    expect(section).toHaveAttribute('aria-label', 'Drafted for you');

    expect(screen.getAllByTestId('draft-featured')).toHaveLength(1);
    expect(screen.getByTestId('draft-featured')).toHaveTextContent('draft-1');
    const rows = screen.getAllByTestId('draft-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('draft-2');
    expect(rows[1]).toHaveTextContent('draft-3');
  });

  it('(d) renders only the featured card when a single draft resolves', async () => {
    listMock.mockResolvedValue([makeDraft('draft-1')]);
    render(<DraftsThreadMessage />);
    await waitFor(() => {
      expect(screen.getByText('I drafted 1 thing for you while you were away. Take a look.')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('draft-featured')).toHaveLength(1);
    expect(screen.queryAllByTestId('draft-row')).toHaveLength(0);
  });

  it('(e) dismissing the featured draft promotes the next draft to featured', async () => {
    listMock.mockResolvedValue([makeDraft('draft-1'), makeDraft('draft-2')]);
    render(<DraftsThreadMessage />);

    await waitFor(() => {
      expect(screen.getByTestId('draft-featured')).toHaveTextContent('draft-1');
    });
    expect(screen.getByTestId('draft-row')).toHaveTextContent('draft-2');

    await userEvent.click(screen.getByRole('button', { name: 'dismiss-featured' }));

    await waitFor(() => {
      expect(screen.getByTestId('draft-featured')).toHaveTextContent('draft-2');
    });
    expect(screen.queryAllByTestId('draft-row')).toHaveLength(0);
  });

  it('(f) dismissing the last draft hides the section', async () => {
    listMock.mockResolvedValue([makeDraft('draft-1')]);
    const { container } = render(<DraftsThreadMessage />);

    await waitFor(() => {
      expect(screen.getByTestId('draft-featured')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'dismiss-featured' }));

    await waitFor(() => {
      expect(container.querySelector('#drafts')).toBeNull();
    });
    expect(screen.queryByText(/I drafted/)).toBeNull();
  });
});
