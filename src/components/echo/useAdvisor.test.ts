import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const advisorMock = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: { kb: { advisor: () => advisorMock() } },
}));

import { useAdvisor } from './useAdvisor';
import type { AdvisorResponse } from '@/types/advisor';

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
  nudge: { headline: 'h', subhead: 's', actions: [] },
  proposals: [],
};

describe('useAdvisor', () => {
  beforeEach(() => advisorMock.mockReset());

  it('returns the advisor payload on success', async () => {
    advisorMock.mockResolvedValue({ success: true, data: EMPTY });
    const { result } = renderHook(() => useAdvisor());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.advisor?.state).toBe('empty');
    expect(result.current.error).toBeNull();
  });

  it('sets error and null advisor on failure', async () => {
    advisorMock.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useAdvisor());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.advisor).toBeNull();
    expect(result.current.error).toBe('network');
  });
});
