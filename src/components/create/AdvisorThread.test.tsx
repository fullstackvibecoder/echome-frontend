import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AdvisorThread, PITCH } from './AdvisorThread';
import type { AdvisorResponse, Coverage, Proposal } from '@/types/advisor';

vi.mock('@/components/create/AutopilotProposalCard', () => ({
  AutopilotProposalCard: ({ proposal, onSelect }: { proposal: Proposal; onSelect: (p: Proposal) => void }) => (
    <button data-testid="proposal" onClick={() => onSelect(proposal)}>{proposal.title}</button>
  ),
}));

vi.mock('@/components/create/CoverageMeter', () => ({
  CoverageMeter: ({ coverage }: { coverage: Coverage }) => (
    <div data-testid="coverage">{Object.keys(coverage).length}</div>
  ),
}));

const FULL_COVERAGE: Coverage = {
  work: { covered: true, strength: 1, sampleCount: 5 },
  industry: { covered: true, strength: 0.8, sampleCount: 3 },
  interests: { covered: false, strength: 0.2, sampleCount: 1 },
  personal: { covered: false, strength: 0, sampleCount: 0 },
  relationships: { covered: false, strength: 0, sampleCount: 0 },
  voice: { covered: true, strength: 0.9, sampleCount: 10 },
};

const DEFAULT_NUDGE = {
  headline: 'Add your voice to teach Echo faster',
  subhead: 'A two-minute recording gives Echo more signal than a stack of documents.',
  actions: [
    { label: 'Record now', type: 'voice' as const },
    { label: 'Skip for now', type: 'create' as const },
  ],
};

const DEFAULT_PROPOSALS: Proposal[] = [
  { id: 'p1', title: 'LinkedIn thought piece', rationale: 'High engagement for your audience', kitType: 'linkedin_post', sourceRefs: [] },
  { id: 'p2', title: 'Newsletter intro', rationale: 'Builds your list', kitType: 'newsletter', sourceRefs: [] },
];

function makeAdvisor(overrides: Partial<AdvisorResponse>): AdvisorResponse {
  return {
    state: 'empty',
    coverage: FULL_COVERAGE,
    nudge: DEFAULT_NUDGE,
    proposals: DEFAULT_PROPOSALS,
    ...overrides,
  };
}

describe('AdvisorThread', () => {
  describe('empty state', () => {
    it('renders the advisor-empty wrapper', () => {
      const advisor = makeAdvisor({ state: 'empty' });
      render(
        <AdvisorThread
          advisor={advisor}
          onNudgeAction={vi.fn()}
          onProposalSelect={vi.fn()}
        />,
      );
      expect(screen.getByTestId('advisor-empty')).toBeInTheDocument();
    });

    it('shows the pitch text', () => {
      const advisor = makeAdvisor({ state: 'empty' });
      render(
        <AdvisorThread
          advisor={advisor}
          onNudgeAction={vi.fn()}
          onProposalSelect={vi.fn()}
        />,
      );
      expect(screen.getByText(PITCH)).toBeInTheDocument();
    });

    it('does not render coverage or proposals', () => {
      const advisor = makeAdvisor({ state: 'empty' });
      render(
        <AdvisorThread
          advisor={advisor}
          onNudgeAction={vi.fn()}
          onProposalSelect={vi.fn()}
        />,
      );
      expect(screen.queryByTestId('coverage')).not.toBeInTheDocument();
      expect(screen.queryByTestId('proposal')).not.toBeInTheDocument();
    });
  });

  describe('thin state', () => {
    it('renders the advisor-thin wrapper', () => {
      const advisor = makeAdvisor({ state: 'thin' });
      render(
        <AdvisorThread
          advisor={advisor}
          onNudgeAction={vi.fn()}
          onProposalSelect={vi.fn()}
        />,
      );
      expect(screen.getByTestId('advisor-thin')).toBeInTheDocument();
    });

    it('shows nudge headline and subhead', () => {
      const advisor = makeAdvisor({ state: 'thin' });
      render(
        <AdvisorThread
          advisor={advisor}
          onNudgeAction={vi.fn()}
          onProposalSelect={vi.fn()}
        />,
      );
      expect(screen.getByText(DEFAULT_NUDGE.headline)).toBeInTheDocument();
      expect(screen.getByText(DEFAULT_NUDGE.subhead)).toBeInTheDocument();
    });

    it('renders one nudge-action button per action', () => {
      const advisor = makeAdvisor({ state: 'thin' });
      render(
        <AdvisorThread
          advisor={advisor}
          onNudgeAction={vi.fn()}
          onProposalSelect={vi.fn()}
        />,
      );
      const buttons = screen.getAllByTestId('nudge-action');
      expect(buttons).toHaveLength(DEFAULT_NUDGE.actions.length);
      expect(buttons[0]).toHaveTextContent('Record now');
      expect(buttons[1]).toHaveTextContent('Skip for now');
    });

    it('clicking a nudge action calls onNudgeAction with that action object', async () => {
      const onNudgeAction = vi.fn();
      const advisor = makeAdvisor({ state: 'thin' });
      render(
        <AdvisorThread
          advisor={advisor}
          onNudgeAction={onNudgeAction}
          onProposalSelect={vi.fn()}
        />,
      );
      const buttons = screen.getAllByTestId('nudge-action');
      await userEvent.click(buttons[0]);
      expect(onNudgeAction).toHaveBeenCalledWith(DEFAULT_NUDGE.actions[0]);
    });
  });

  describe('rich state', () => {
    it('renders the advisor-rich wrapper', () => {
      const advisor = makeAdvisor({ state: 'rich' });
      render(
        <AdvisorThread
          advisor={advisor}
          onNudgeAction={vi.fn()}
          onProposalSelect={vi.fn()}
        />,
      );
      expect(screen.getByTestId('advisor-rich')).toBeInTheDocument();
    });

    it('renders an AutopilotProposalCard per proposal', () => {
      const advisor = makeAdvisor({ state: 'rich' });
      render(
        <AdvisorThread
          advisor={advisor}
          onNudgeAction={vi.fn()}
          onProposalSelect={vi.fn()}
        />,
      );
      const cards = screen.getAllByTestId('proposal');
      expect(cards).toHaveLength(DEFAULT_PROPOSALS.length);
    });

    it('renders the CoverageMeter', () => {
      const advisor = makeAdvisor({ state: 'rich' });
      render(
        <AdvisorThread
          advisor={advisor}
          onNudgeAction={vi.fn()}
          onProposalSelect={vi.fn()}
        />,
      );
      expect(screen.getByTestId('coverage')).toBeInTheDocument();
    });

    it('clicking a proposal calls onProposalSelect with that proposal', async () => {
      const onProposalSelect = vi.fn();
      const advisor = makeAdvisor({ state: 'rich' });
      render(
        <AdvisorThread
          advisor={advisor}
          onNudgeAction={vi.fn()}
          onProposalSelect={onProposalSelect}
        />,
      );
      const cards = screen.getAllByTestId('proposal');
      await userEvent.click(cards[0]);
      expect(onProposalSelect).toHaveBeenCalledWith(DEFAULT_PROPOSALS[0]);
    });

    it('suppresses the nudge when proposals exist (redundant with the drafts)', () => {
      const advisor = makeAdvisor({ state: 'rich' });
      render(
        <AdvisorThread
          advisor={advisor}
          onNudgeAction={vi.fn()}
          onProposalSelect={vi.fn()}
        />,
      );
      expect(screen.queryByTestId('nudge-action')).not.toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_NUDGE.headline)).not.toBeInTheDocument();
    });

    it('shows the nudge when headline is non-empty and there are no proposals', () => {
      const advisor = makeAdvisor({ state: 'rich', proposals: [] });
      render(
        <AdvisorThread
          advisor={advisor}
          onNudgeAction={vi.fn()}
          onProposalSelect={vi.fn()}
        />,
      );
      expect(screen.getByText(DEFAULT_NUDGE.headline)).toBeInTheDocument();
    });

    it('renders NO nudge block when headline is empty string', () => {
      const advisor = makeAdvisor({
        state: 'rich',
        proposals: [],
        nudge: { headline: '', subhead: '', actions: [] },
      });
      render(
        <AdvisorThread
          advisor={advisor}
          onNudgeAction={vi.fn()}
          onProposalSelect={vi.fn()}
        />,
      );
      expect(screen.queryByTestId('nudge-action')).not.toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_NUDGE.headline)).not.toBeInTheDocument();
    });
  });
});
