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
  it('renders title and rationale', () => {
    render(<AutopilotProposalCard proposal={proposal} onSelect={() => {}} />);
    expect(screen.getByText('A LinkedIn post on hiring')).toBeInTheDocument();
    expect(screen.getByText(/team building/i)).toBeInTheDocument();
  });

  it('calls onSelect with the proposal on click', async () => {
    const onSelect = vi.fn();
    render(<AutopilotProposalCard proposal={proposal} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(proposal);
  });
});
