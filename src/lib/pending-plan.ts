import type { BillingInterval, PlanId } from '@/lib/api-client';

/**
 * Plan picked on the homepage pricing section, carried through signup so the
 * new account lands straight in Stripe Checkout.
 *
 * Signup links look like /auth/signup?plan=echo-studio&interval=year or
 * /auth/signup?plan=echo-teams&voices=4&interval=month.
 */
export interface PendingPlan {
  planId: PlanId;
  billingInterval: BillingInterval;
  quantity?: number;
}

export const PENDING_PLAN_KEY = 'pendingPlan';

// Only plans the backend checkout accepts (PURCHASABLE_PLAN_IDS in the BE stripe route).
const PURCHASABLE: readonly PlanId[] = ['echo', 'echo-studio', 'echo-teams'];
const TEAMS_MIN_VOICES = 2;
const TEAMS_MAX_VOICES = 100;

function parseVoices(raw: string | null | undefined): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < TEAMS_MIN_VOICES) return TEAMS_MIN_VOICES;
  return Math.min(n, TEAMS_MAX_VOICES);
}

/** Reads plan, interval and voices from signup URL params. Null when no valid plan. */
export function parseSignupPlan(params: { get(name: string): string | null }): PendingPlan | null {
  const rawPlan = params.get('plan');
  if (!rawPlan) return null;

  const interval = params.get('interval');
  const billingInterval: BillingInterval = interval === 'year' || interval === 'annual' ? 'year' : 'month';

  // Older links used echo-teams-2/5/10; the backend only sells echo-teams with a voice count.
  const legacyTeams = /^echo-teams-(\d+)$/.exec(rawPlan);
  if (legacyTeams) {
    return { planId: 'echo-teams', billingInterval, quantity: parseVoices(legacyTeams[1]) };
  }

  if (!PURCHASABLE.includes(rawPlan as PlanId)) return null;
  const planId = rawPlan as PlanId;
  if (planId === 'echo-teams') {
    return { planId, billingInterval, quantity: parseVoices(params.get('voices')) };
  }
  return { planId, billingInterval };
}

/**
 * Reads what parseSignupPlan stored. Accepts the old format too (a bare plan
 * id string), so a signup started before this deploy still reaches checkout.
 */
export function readStoredPendingPlan(raw: string | null): PendingPlan | null {
  if (!raw) return null;
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as Partial<PendingPlan>;
      // Re-validate through the same rules as the URL so storage can't smuggle
      // in an unsellable plan or an out-of-range voice count.
      const fields: Record<string, string | null> = {
        plan: typeof parsed.planId === 'string' ? parsed.planId : null,
        interval: parsed.billingInterval === 'year' ? 'year' : 'month',
        voices: typeof parsed.quantity === 'number' ? String(parsed.quantity) : null,
      };
      return parseSignupPlan({ get: (name) => fields[name] ?? null });
    } catch {
      return null;
    }
  }
  return parseSignupPlan({ get: (name) => (name === 'plan' ? raw : null) });
}
