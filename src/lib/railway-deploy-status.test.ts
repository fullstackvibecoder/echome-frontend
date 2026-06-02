import { describe, it, expect } from 'vitest';
import { mapDeploymentStatusToState } from './railway-deploy-status';

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
