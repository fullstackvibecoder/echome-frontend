import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AdaptiveCreateSurface } from './AdaptiveCreateSurface';
import type { AdvisorResponse } from '@/types/advisor';

const advisorMock = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: { kb: { advisor: () => advisorMock() } },
}));

const RICH: AdvisorResponse = {
  state: 'rich',
  coverage: {
    work: { covered: true, strength: 1, sampleCount: 4 },
    industry: { covered: true, strength: 1, sampleCount: 5 },
    interests: { covered: true, strength: 0.6, sampleCount: 5 },
    personal: { covered: true, strength: 1, sampleCount: 4 },
    relationships: { covered: false, strength: 0, sampleCount: 0 },
    voice: { covered: true, strength: 1, sampleCount: 20 },
  },
  nudge: { headline: 'Echo can build from what you shared.', subhead: 'Pick a draft.', actions: [{ label: 'Make something now', type: 'create' }] },
  proposals: [{ id: 'p1', title: 'A post on hiring', rationale: 'You talk about teams.', kitType: 'social_post', sourceRefs: [] }],
};

const EMPTY: AdvisorResponse = {
  state: 'empty',
  coverage: {
    work: { covered: false, strength: 0, sampleCount: 0 },
    industry: { covered: false, strength: 0, sampleCount: 0 },
    interests: { covered: false, strength: 0, sampleCount: 0 },
    personal: { covered: false, strength: 0, sampleCount: 0 },
    relationships: { covered: false, strength: 0, sampleCount: 0 },
    voice: { covered: false, strength: 0, sampleCount: 0 },
  },
  nudge: { headline: 'Teach Echo your voice.', subhead: 'Talk for two minutes.', actions: [{ label: 'Talk for two minutes', type: 'voice' }] },
  proposals: [],
};

describe('AdaptiveCreateSurface', () => {
  beforeEach(() => advisorMock.mockReset());

  it('renders proposals in the rich state', async () => {
    advisorMock.mockResolvedValue({ success: true, data: RICH });
    render(<AdaptiveCreateSurface onPrefill={() => {}} onStartVoice={() => {}} onOpenIngest={() => {}} />);
    await waitFor(() => expect(screen.getByText('A post on hiring')).toBeInTheDocument());
  });

  it('renders the voice-first nudge in the empty state', async () => {
    advisorMock.mockResolvedValue({ success: true, data: EMPTY });
    render(<AdaptiveCreateSurface onPrefill={() => {}} onStartVoice={() => {}} onOpenIngest={() => {}} />);
    await waitFor(() => expect(screen.getByText('Teach Echo your voice.')).toBeInTheDocument());
  });

  it('falls back to a usable layout when the advisor request fails', async () => {
    advisorMock.mockRejectedValue(new Error('network'));
    render(<AdaptiveCreateSurface onPrefill={() => {}} onStartVoice={() => {}} onOpenIngest={() => {}} />);
    await waitFor(() => expect(screen.getByText(/What Echo can do/i)).toBeInTheDocument());
  });
});
