import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/railway-deploy-status', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/railway-deploy-status')>();
  return {
    ...actual,
    readRailwayConfig: vi.fn(),
    fetchLatestDeploymentState: vi.fn(),
  };
});

import { GET } from './route';
import { readRailwayConfig, fetchLatestDeploymentState } from '@/lib/railway-deploy-status';

describe('GET /api/backend-status', () => {
  beforeEach(() => {
    vi.mocked(readRailwayConfig).mockReset();
    vi.mocked(fetchLatestDeploymentState).mockReset();
  });

  it('returns unknown when config is missing', async () => {
    vi.mocked(readRailwayConfig).mockReturnValue(null);
    const res = await GET();
    expect(await res.json()).toEqual({ state: 'unknown' });
    expect(fetchLatestDeploymentState).not.toHaveBeenCalled();
  });

  it('returns the fetched deploy state when config is present', async () => {
    vi.mocked(readRailwayConfig).mockReturnValue({ token: 't', projectId: 'p', serviceId: 's', environmentId: 'e' });
    vi.mocked(fetchLatestDeploymentState).mockResolvedValue('deploying');
    const res = await GET();
    expect(await res.json()).toEqual({ state: 'deploying' });
  });
});
