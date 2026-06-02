import { describe, it, expect } from 'vitest';
import { computeBackendStatus, DOWN_THRESHOLD } from './backend-health-state';

describe('computeBackendStatus', () => {
  it('is ok when health is fine', () => {
    expect(computeBackendStatus({ healthOk: true, consecutiveFailures: 0, deployState: 'up' })).toBe('ok');
    expect(computeBackendStatus({ healthOk: true, consecutiveFailures: 9, deployState: 'unknown' })).toBe('ok');
  });
  it('is ok while failures are below the threshold (single flake)', () => {
    expect(computeBackendStatus({ healthOk: false, consecutiveFailures: 1, deployState: 'unknown' })).toBe('ok');
  });
  it('renders nothing (ok) while the deploy-state probe is in flight', () => {
    expect(computeBackendStatus({ healthOk: false, consecutiveFailures: DOWN_THRESHOLD, deployState: 'pending' })).toBe('ok');
  });
  it('is updating when down and a deploy is in progress', () => {
    expect(computeBackendStatus({ healthOk: false, consecutiveFailures: DOWN_THRESHOLD, deployState: 'deploying' })).toBe('updating');
  });
  it('is outage when down and deploy-state is up or unknown', () => {
    expect(computeBackendStatus({ healthOk: false, consecutiveFailures: DOWN_THRESHOLD, deployState: 'up' })).toBe('outage');
    expect(computeBackendStatus({ healthOk: false, consecutiveFailures: DOWN_THRESHOLD, deployState: 'unknown' })).toBe('outage');
  });
});
