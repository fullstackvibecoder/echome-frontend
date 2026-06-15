import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftRow } from './DraftRow';
import type { DraftProposal } from '@/types';
import { api } from '@/lib/api-client';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api-client', () => ({
  api: { drafts: { recordAction: vi.fn().mockResolvedValue(undefined), dismiss: vi.fn().mockResolvedValue(undefined) } },
}));
vi.mock('@/lib/toast', () => ({ showInfoToast: vi.fn() }));

function makeDraft(overrides: Partial<DraftProposal> = {}): DraftProposal {
  return {
    id: 'd1',
    title: 'Why I stopped doing open houses',
    created_at: '2026-06-14T00:00:00Z',
    origin: 'autonomous',
    content_linkedin: 'body',
    content_instagram: null,
    content_twitter: null,
    ...overrides,
  };
}

describe('DraftRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    push.mockClear();
  });

  it('renders the title on a single truncated line', () => {
    render(<DraftRow draft={makeDraft()} onDismissed={() => {}} />);
    const title = screen.getByText('Why I stopped doing open houses');
    expect(title).toHaveClass('truncate');
  });

  it('shows the platform meta label derived from populated copy', () => {
    render(<DraftRow draft={makeDraft({ content_linkedin: 'x' })} onDismissed={() => {}} />);
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
  });

  it('records a review and navigates when the row is clicked', async () => {
    render(<DraftRow draft={makeDraft()} onDismissed={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /why i stopped/i }));
    expect(vi.mocked(api.drafts.recordAction)).toHaveBeenCalledWith('d1', 'reviewed');
    expect(push).toHaveBeenCalledWith('/app/library/d1');
  });

  it('exposes Review, Schedule, and Kill controls', () => {
    render(<DraftRow draft={makeDraft()} onDismissed={() => {}} />);
    expect(screen.getByLabelText('Review draft')).toBeInTheDocument();
    expect(screen.getByLabelText('Schedule draft')).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss draft')).toBeInTheDocument();
  });

  it('removes the draft on dismiss', async () => {
    const onDismissed = vi.fn();
    render(<DraftRow draft={makeDraft()} onDismissed={onDismissed} />);
    await userEvent.click(screen.getByLabelText('Dismiss draft'));
    expect(vi.mocked(api.drafts.dismiss)).toHaveBeenCalledWith('d1');
    expect(onDismissed).toHaveBeenCalledWith('d1');
  });
});
