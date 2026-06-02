import type { DeployState } from './railway-deploy-status';

export type BackendStatus = 'ok' | 'updating' | 'outage';

/** Consecutive failed /health checks before we treat the backend as down. */
export const DOWN_THRESHOLD = 2;

export interface HealthInputs {
  healthOk: boolean;
  consecutiveFailures: number;
  /** 'pending' = down and the deploy-state probe hasn't resolved yet. */
  deployState: DeployState | 'pending';
}

export function computeBackendStatus({ healthOk, consecutiveFailures, deployState }: HealthInputs): BackendStatus {
  if (healthOk) return 'ok';
  if (consecutiveFailures < DOWN_THRESHOLD) return 'ok';
  if (deployState === 'pending') return 'ok'; // in flight — render nothing until we know
  if (deployState === 'deploying') return 'updating';
  return 'outage'; // 'up' | 'unknown' — the conservative default
}
