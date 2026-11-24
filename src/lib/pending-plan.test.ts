import { describe, expect, it } from 'vitest';
import { parseSignupPlan, readStoredPendingPlan } from './pending-plan';

const params = (q: string) => new URLSearchParams(q);

describe('parseSignupPlan', () => {
  it('returns null with no plan or an unsellable plan', () => {
    expect(parseSignupPlan(params(''))).toBeNull();
    expect(parseSignupPlan(params('plan=echo-pro'))).toBeNull();
    expect(parseSignupPlan(params('plan=bogus'))).toBeNull();
  });

  it('defaults to monthly', () => {
    expect(parseSignupPlan(params('plan=echo'))).toEqual({ planId: 'echo', billingInterval: 'month' });
  });

  it('carries the annual choice', () => {
    expect(parseSignupPlan(params('plan=echo-studio&interval=year'))).toEqual({
      planId: 'echo-studio',
      billingInterval: 'year',
    });
  });

  it('keeps echo-teams with its voice count (the homepage Teams button)', () => {
    expect(parseSignupPlan(params('plan=echo-teams&voices=4&interval=year'))).toEqual({
      planId: 'echo-teams',
      billingInterval: 'year',
      quantity: 4,
    });
  });

  it('clamps teams voices to the 2 minimum', () => {
    expect(parseSignupPlan(params('plan=echo-teams'))?.quantity).toBe(2);
    expect(parseSignupPlan(params('plan=echo-teams&voices=1'))?.quantity).toBe(2);
    expect(parseSignupPlan(params('plan=echo-teams&voices=abc'))?.quantity).toBe(2);
  });

  it('maps legacy echo-teams-N links to echo-teams with N voices', () => {
    expect(parseSignupPlan(params('plan=echo-teams-5'))).toEqual({
      planId: 'echo-teams',
      billingInterval: 'month',
      quantity: 5,
    });
  });
});

describe('readStoredPendingPlan', () => {
  it('reads the JSON format', () => {
    const stored = JSON.stringify({ planId: 'echo-teams', billingInterval: 'year', quantity: 3 });
    expect(readStoredPendingPlan(stored)).toEqual({ planId: 'echo-teams', billingInterval: 'year', quantity: 3 });
  });

  it('reads the old bare plan id format', () => {
    expect(readStoredPendingPlan('echo-studio')).toEqual({ planId: 'echo-studio', billingInterval: 'month' });
  });

  it('re-validates stored JSON: unsellable plans dropped, voices clamped', () => {
    expect(readStoredPendingPlan(JSON.stringify({ planId: 'echo-pro', billingInterval: 'month' }))).toBeNull();
    expect(readStoredPendingPlan(JSON.stringify({ planId: 'echo-teams', billingInterval: 'month', quantity: 9999 }))?.quantity).toBe(100);
    expect(readStoredPendingPlan(JSON.stringify({ planId: 'echo', billingInterval: 'month', quantity: 5 }))).toEqual({ planId: 'echo', billingInterval: 'month' });
  });

  it('returns null for empty or junk', () => {
    expect(readStoredPendingPlan(null)).toBeNull();
    expect(readStoredPendingPlan('{bad json')).toBeNull();
  });
});
