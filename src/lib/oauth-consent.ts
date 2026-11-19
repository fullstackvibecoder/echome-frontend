/**
 * Calls behind the EchoMe in Claude consent page (/oauth/authorize).
 * The OAuth endpoints live at the API root (api.tryechome.com/oauth/...), not
 * under /api, so these requests override the client's baseURL. The session
 * JWT is added by the apiClient interceptor as usual.
 */
import { apiClient } from '@/lib/api-client';

// Same default as api-client's base URL, minus the /api suffix.
export const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

/** The MCP URL users paste into Claude: the API root + /mcp. */
export const MCP_URL = `${API_ROOT}/mcp`;

export const AUTHORIZE_PARAM_KEYS = [
  'response_type',
  'client_id',
  'redirect_uri',
  'state',
  'code_challenge',
  'code_challenge_method',
  'scope',
  'resource',
  'prompt',
] as const;

export type AuthorizeParams = Partial<Record<(typeof AUTHORIZE_PARAM_KEYS)[number], string>>;

export function readAuthorizeParams(search: URLSearchParams): AuthorizeParams {
  const out: AuthorizeParams = {};
  for (const key of AUTHORIZE_PARAM_KEYS) {
    const v = search.get(key);
    if (v) out[key] = v;
  }
  return out;
}

export interface ConsentClient {
  name: string;
  logoUri: string | null;
  clientUri: string | null;
  redirectHost: string;
}

export type CheckResult =
  | { kind: 'render_error'; message: string }
  | { kind: 'redirect'; redirectTo: string }
  | { kind: 'plan_required'; message: string }
  | { kind: 'consent'; client: ConsentClient; email: string | null; csrfToken: string; silent: boolean };

export async function checkAuthorize(params: AuthorizeParams): Promise<CheckResult> {
  const res = await apiClient.get<CheckResult>('/oauth/authorize/check', { baseURL: API_ROOT, params });
  return res.data;
}

export async function decideAuthorize(
  params: AuthorizeParams,
  csrfToken: string,
  decision: 'allow' | 'deny',
): Promise<string> {
  const res = await apiClient.post<{ redirectTo?: string; error?: string; message?: string }>(
    '/oauth/authorize/decision',
    { ...params, csrf_token: csrfToken, decision },
    { baseURL: API_ROOT },
  );
  if (!res.data.redirectTo) throw new Error(res.data.message || res.data.error || 'Could not finish connecting.');
  return res.data.redirectTo;
}

/**
 * Last check before navigating to the app's callback. The server only hands
 * back registered redirect URIs; this refuses script or local-data schemes
 * and keeps native app schemes (cursor://, claude://) working.
 */
const BLOCKED_SCHEMES = new Set(['javascript:', 'data:', 'vbscript:', 'blob:', 'file:', 'about:']);
export function isSafeRedirectTarget(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return !BLOCKED_SCHEMES.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Connected apps (Settings). */
export interface ConnectedApp {
  id: string;
  clientName: string;
  logoUri: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export async function listConnectedApps(): Promise<ConnectedApp[]> {
  const res = await apiClient.get<{ grants: ConnectedApp[] }>('/oauth/grants');
  return res.data.grants ?? [];
}

export async function revokeConnectedApp(id: string): Promise<void> {
  await apiClient.delete(`/oauth/grants/${encodeURIComponent(id)}`);
}

/** Personal MCP keys (Claude Code, Cursor). Studio only; the full key is shown once. */
export interface McpKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export async function listMcpKeys(): Promise<McpKey[]> {
  const res = await apiClient.get<{ keys: McpKey[] }>('/oauth/keys');
  return res.data.keys ?? [];
}

export async function createMcpKey(name: string): Promise<McpKey & { key: string }> {
  const res = await apiClient.post<McpKey & { key: string }>('/oauth/keys', { name });
  return res.data;
}

export async function revokeMcpKey(id: string): Promise<void> {
  await apiClient.delete(`/oauth/keys/${encodeURIComponent(id)}`);
}

export function claudeCodeCommand(key: string, url = MCP_URL): string {
  return `claude mcp add --transport http echome ${url} --header "Authorization: Bearer ${key}"`;
}

export function cursorConfig(key: string, url = MCP_URL): string {
  return JSON.stringify({ mcpServers: { echome: { url, headers: { Authorization: `Bearer ${key}` } } } }, null, 2);
}
