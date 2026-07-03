import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ProposalChips } from './ProposalChips';
import type { Proposal } from '@/types/advisor';

const proposals: Proposal[] = [
  { id: 'p1', title: 'Clip Tuesday coaching call', rationale: '', kitType: 'clips', sourceRefs: [] },
  { id: 'p2', title: 'Post about pricing objections', rationale: '', kitType: 'linkedin_post', sourceRefs: [] },
  { id: 'p3', title: 'Carousel: 5 listing myths', rationale: '', kitType: 'carousel', sourceRefs: [] },
  { id: 'p4', title: 'Fourth proposal', rationale: '', kitType: 'newsletter', sourceRefs: [] },
];

describe('ProposalChips', () => {
  it('renders at most 3 chips', () => {
    render(<ProposalChips proposals={proposals} onSelect={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.queryByText('Fourth proposal')).not.toBeInTheDocument();
  });

  it('marks only the first chip as the top pick', () => {
    render(<ProposalChips proposals={proposals} onSelect={vi.fn()} />);
    const chips = screen.getAllByRole('button');
    expect(chips[0]).toHaveAttribute('data-top-pick', 'true');
    expect(chips[1]).not.toHaveAttribute('data-top-pick');
  });

  it('clicking a chip calls onSelect with that proposal', async () => {
    const onSelect = vi.fn();
    render(<ProposalChips proposals={proposals} onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Post about pricing objections'));
    expect(onSelect).toHaveBeenCalledWith(proposals[1]);
  });

  it('renders the knowledge-base caption when chips exist', () => {
    render(<ProposalChips proposals={proposals} onSelect={vi.fn()} />);
    expect(screen.getByText(/suggested from your knowledge base/i)).toBeInTheDocument();
  });

  it('renders nothing with no proposals', () => {
    const { container } = render(<ProposalChips proposals={[]} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
