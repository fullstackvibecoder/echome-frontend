import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoverageMeter } from './CoverageMeter';
import type { Coverage } from '@/types/advisor';

const coverage: Coverage = {
  work: { covered: true, strength: 1, sampleCount: 4 },
  industry: { covered: true, strength: 0.8, sampleCount: 4 },
  interests: { covered: false, strength: 0.1, sampleCount: 1 },
  personal: { covered: false, strength: 0, sampleCount: 0 },
  relationships: { covered: false, strength: 0, sampleCount: 0 },
  voice: { covered: true, strength: 0.9, sampleCount: 20 },
};

describe('CoverageMeter', () => {
  it('renders all six dimension labels', () => {
    render(<CoverageMeter coverage={coverage} />);
    for (const label of ['Work', 'Industry', 'Interests', 'Personal', 'Relationships', 'Voice']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('shows the covered count', () => {
    render(<CoverageMeter coverage={coverage} />);
    expect(screen.getByText(/3 of 6/i)).toBeInTheDocument();
  });

  it('renders the heading label', () => {
    render(<CoverageMeter coverage={coverage} />);
    expect(screen.getByText('How well does Echo know you')).toBeInTheDocument();
  });
});
