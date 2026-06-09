import { describe, it, expect } from 'vitest';
import {
  mapDeploymentStatusToState,
  readRailwayConfig,
  fetchLatestDeploymentState,
} from './railway-deploy-status';

describe('mapDeploymentStatusToState', () => {
  it('maps in-progress statuses to deploying', () => {
    for (const s of ['BUILDING', 'DEPLOYING', 'INITIALIZING', 'QUEUED', 'WAITING', 'NEEDS_APPROVAL']) {
      expect(mapDeploymentStatusToState(s)).toBe('deploying');
    }
  });
  it('maps healthy statuses to up', () => {
    expect(mapDeploymentStatusToState('SUCCESS')).toBe('up');
    expect(mapDeploymentStatusToState('SLEEPING')).toBe('up');
  });
  it('maps failures and anything else to unknown', () => {
    for (const s of ['FAILED', 'CRASHED', 'REMOVED', 'SOMETHING_NEW']) {
      expect(mapDeploymentStatusToState(s)).toBe('unknown');
    }
  });
  it('treats null/undefined/empty as unknown', () => {
    expect(mapDeploymentStatusToState(null)).toBe('unknown');
    expect(mapDeploymentStatusToState(undefined)).toBe('unknown');
    expect(mapDeploymentStatusToState('')).toBe('unknown');
  });
  it('is case-insensitive', () => {
    expect(mapDeploymentStatusToState('building')).toBe('deploying');
  });
});

describe('readRailwayConfig', () => {
  const full = {
    RAILWAY_API_TOKEN: 't', RAILWAY_PROJECT_ID: 'p',
    RAILWAY_SERVICE_ID: 's', RAILWAY_ENVIRONMENT_ID: 'e',
  };
  it('returns config when all vars present', () => {
    expect(readRailwayConfig(full)).toEqual({ token: 't', projectId: 'p', serviceId: 's', environmentId: 'e' });
  });
  it('returns null if any var missing', () => {
    expect(readRailwayConfig({ ...full, RAILWAY_API_TOKEN: undefined })).toBeNull();
    expect(readRailwayConfig({})).toBeNull();
  });
});

describe('fetchLatestDeploymentState', () => {
  const cfg = { token: 't', projectId: 'p', serviceId: 's', environmentId: 'e' };
  it('returns the mapped state from the latest deployment', async () => {
    const fakeFetch = (async () => ({
      ok: true,
      json: async () => ({ data: { deployments: { edges: [{ node: { status: 'DEPLOYING' } }] } } }),
    })) as unknown as typeof fetch;
    expect(await fetchLatestDeploymentState(cfg, fakeFetch)).toBe('deploying');
  });
  it('returns unknown on non-ok response', async () => {
    const fakeFetch = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    expect(await fetchLatestDeploymentState(cfg, fakeFetch)).toBe('unknown');
  });
  it('returns unknown when the fetch throws (network/abort)', async () => {
    const fakeFetch = (async () => { throw new Error('boom'); }) as unknown as typeof fetch;
    expect(await fetchLatestDeploymentState(cfg, fakeFetch)).toBe('unknown');
  });
  it('returns unknown when there are no deployments', async () => {
    const fakeFetch = (async () => ({ ok: true, json: async () => ({ data: { deployments: { edges: [] } } }) })) as unknown as typeof fetch;
    expect(await fetchLatestDeploymentState(cfg, fakeFetch)).toBe('unknown');
  });
  it('treats a RECENT SUCCESS as deploying (new container still booting)', async () => {
    const now = 1_000_000_000_000;
    const createdAt = new Date(now - 60_000).toISOString(); // 1 min ago
    const fakeFetch = (async () => ({
      ok: true,
      json: async () => ({ data: { deployments: { edges: [{ node: { status: 'SUCCESS', createdAt } }] } } }),
    })) as unknown as typeof fetch;
    expect(await fetchLatestDeploymentState(cfg, fakeFetch, 3000, now)).toBe('deploying');
  });
  it('treats an OLD SUCCESS as up (genuine outage if backend down)', async () => {
    const now = 1_000_000_000_000;
    const createdAt = new Date(now - 60 * 60_000).toISOString(); // 1 hour ago
    const fakeFetch = (async () => ({
      ok: true,
      json: async () => ({ data: { deployments: { edges: [{ node: { status: 'SUCCESS', createdAt } }] } } }),
    })) as unknown as typeof fetch;
    expect(await fetchLatestDeploymentState(cfg, fakeFetch, 3000, now)).toBe('up');
  });
});
