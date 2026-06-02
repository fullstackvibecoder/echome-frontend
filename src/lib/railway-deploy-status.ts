export type DeployState = 'deploying' | 'up' | 'unknown';

// Railway deployment.status values. The DEPLOYING/UP membership was verified
// against the live API (a healthy deploy returns SUCCESS → 'up').
const DEPLOYING_STATUSES = new Set([
  'BUILDING', 'DEPLOYING', 'INITIALIZING', 'QUEUED', 'WAITING', 'NEEDS_APPROVAL',
]);
const UP_STATUSES = new Set(['SUCCESS', 'SLEEPING']);

export function mapDeploymentStatusToState(status: string | null | undefined): DeployState {
  if (!status) return 'unknown';
  const s = status.toUpperCase();
  if (DEPLOYING_STATUSES.has(s)) return 'deploying';
  if (UP_STATUSES.has(s)) return 'up';
  return 'unknown';
}
