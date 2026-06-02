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

export interface RailwayConfig {
  token: string;
  projectId: string;
  serviceId: string;
  environmentId: string;
}

export function readRailwayConfig(env: Record<string, string | undefined> = process.env): RailwayConfig | null {
  const token = env.RAILWAY_API_TOKEN;
  const projectId = env.RAILWAY_PROJECT_ID;
  const serviceId = env.RAILWAY_SERVICE_ID;
  const environmentId = env.RAILWAY_ENVIRONMENT_ID;
  if (!token || !projectId || !serviceId || !environmentId) return null;
  return { token, projectId, serviceId, environmentId };
}

const LATEST_DEPLOYMENT_QUERY = `
  query LatestDeployment($input: DeploymentListInput!) {
    deployments(first: 1, input: $input) {
      edges { node { id status createdAt } }
    }
  }
`;

export async function fetchLatestDeploymentState(
  cfg: RailwayConfig,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 3000,
): Promise<DeployState> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify({
        query: LATEST_DEPLOYMENT_QUERY,
        variables: { input: { projectId: cfg.projectId, environmentId: cfg.environmentId, serviceId: cfg.serviceId } },
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return 'unknown';
    const json = await res.json();
    const status = json?.data?.deployments?.edges?.[0]?.node?.status;
    return mapDeploymentStatusToState(status);
  } catch {
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
}
