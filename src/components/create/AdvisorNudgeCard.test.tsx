import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvisorNudgeCard } from './AdvisorNudgeCard';
import type { Nudge } from '@/types/advisor';

const nudge: Nudge = {
  headline: 'Teach Echo your voice.',
  subhead: 'The more you tell Echo, the more it makes.',
  actions: [
    { label: 'Talk for two minutes', type: 'voice' },
    { label: 'Add a video or link', type: 'ingest' },
  ],
};

describe('AdvisorNudgeCard', () => {
  it('renders headline, subhead and actions', () => {
    render(<AdvisorNudgeCard nudge={nudge} onAction={() => {}} />);
    expect(screen.getByText('Teach Echo your voice.')).toBeInTheDocument();
    expect(screen.getByText(/more it makes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Talk for two minutes' })).toBeInTheDocument();
  });

  it('calls onAction with the clicked action', async () => {
    const onAction = vi.fn();
    render(<AdvisorNudgeCard nudge={nudge} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Talk for two minutes' }));
    expect(onAction).toHaveBeenCalledWith(nudge.actions[0]);
  });
});
