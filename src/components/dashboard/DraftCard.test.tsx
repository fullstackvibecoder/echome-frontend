import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftCard } from './DraftCard';
import type { DraftProposal } from '@/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/api-client', () => ({
  api: { drafts: { recordAction: vi.fn().mockResolvedValue(undefined), dismiss: vi.fn().mockResolvedValue(undefined) } },
}));
vi.mock('@/lib/toast', () => ({ showInfoToast: vi.fn() }));

function makeDraft(overrides: Partial<DraftProposal> = {}): DraftProposal {
  return {
    id: 'd1',
    title: 'My title',
    created_at: '2026-06-14T00:00:00Z',
    origin: 'autonomous',
    content_linkedin: 'A'.repeat(300),
    content_instagram: null,
    content_twitter: null,
    ...overrides,
  };
}

describe('DraftCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('truncates preview to 120 chars with an ellipsis', () => {
    render(<DraftCard draft={makeDraft()} onDismissed={() => {}} />);
    const preview = screen.getByText(/A+…$/);
    // 120 chars of body + the ellipsis character
    expect(preview.textContent).toHaveLength(121);
  });

  it('applies line-clamp-2 to the preview', () => {
    render(<DraftCard draft={makeDraft()} onDismissed={() => {}} />);
    const preview = screen.getByText(/A+…$/);
    expect(preview).toHaveClass('line-clamp-2');
  });

  it('shows the Echo drafted badge only for autonomous origin', () => {
    const { rerender } = render(<DraftCard draft={makeDraft({ origin: 'autonomous' })} onDismissed={() => {}} />);
    expect(screen.getByText('Echo drafted')).toBeInTheDocument();
    rerender(<DraftCard draft={makeDraft({ origin: 'user' })} onDismissed={() => {}} />);
    expect(screen.queryByText('Echo drafted')).toBeNull();
  });
});
