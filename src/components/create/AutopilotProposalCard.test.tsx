import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutopilotProposalCard } from './AutopilotProposalCard';
import type { Proposal } from '@/types/advisor';

const proposal: Proposal = {
  id: 'p1',
  title: 'A LinkedIn post on hiring',
  rationale: 'You talk about team building often.',
  kitType: 'social_post',
  sourceRefs: [],
};

describe('AutopilotProposalCard', () => {
  it('always shows the title and kit label', () => {
    render(<AutopilotProposalCard proposal={proposal} onSelect={() => {}} />);
    expect(screen.getByText('A LinkedIn post on hiring')).toBeInTheDocument();
    expect(screen.getByText('social post')).toBeInTheDocument();
  });

  it('keeps the rationale in the DOM but collapses it at rest on hover devices', () => {
    render(<AutopilotProposalCard proposal={proposal} onSelect={() => {}} />);
    const rationale = screen.getByText(/team building/i);
    expect(rationale).toBeInTheDocument();
    expect(rationale.className).toContain('[@media(hover:hover)]:hidden');
    expect(rationale.className).toContain('[@media(hover:hover)]:group-hover:block');
  });

  it('calls onSelect with the proposal on click', async () => {
    const onSelect = vi.fn();
    render(<AutopilotProposalCard proposal={proposal} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(proposal);
  });
});
