import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let studio = true;
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ hasTierAccess: () => studio, loading: false }),
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
const api = vi.hoisted(() => ({
  listConnectedApps: vi.fn(),
  listMcpKeys: vi.fn(),
  createMcpKey: vi.fn(),
  revokeConnectedApp: vi.fn(),
  revokeMcpKey: vi.fn(),
}));
vi.mock('@/lib/oauth-consent', async (orig) => ({
  ...(await orig<typeof import('@/lib/oauth-consent')>()),
  ...Object.fromEntries(Object.entries(api).map(([k, fn]) => [k, (...a: unknown[]) => fn(...a)])),
}));

import { EchoMeInClaude } from './EchoMeInClaude';
import { MCP_URL } from '@/lib/oauth-consent';

beforeEach(() => {
  studio = true;
  Object.values(api).forEach((m) => m.mockReset());
  api.listConnectedApps.mockResolvedValue([
    { id: 'g1', clientName: 'Claude', logoUri: null, createdAt: '2026-11-19T00:00:00Z', lastUsedAt: null },
  ]);
  api.listMcpKeys.mockResolvedValue([]);
});

describe('Settings: EchoMe in Claude', () => {
  it('locks for non-Studio users and loads nothing', () => {
    studio = false;
    render(<EchoMeInClaude />);
    expect(screen.getByText('EchoMe in Claude is part of the Studio plan.')).toBeTruthy();
    expect(screen.queryByText(MCP_URL)).toBeNull();
    expect(api.listConnectedApps).not.toHaveBeenCalled();
  });

  it('shows the URL and connected apps, and disconnects', async () => {
    api.revokeConnectedApp.mockResolvedValue(undefined);
    render(<EchoMeInClaude />);
    expect(screen.getByText(MCP_URL)).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'Disconnect' }));
    await waitFor(() => expect(api.revokeConnectedApp).toHaveBeenCalledWith('g1'));
    await waitFor(() => expect(screen.getByText('No apps connected yet.')).toBeTruthy());
  });

  it('creates a key and shows it once with setup snippets', async () => {
    api.createMcpKey.mockResolvedValue({ id: 'k1', name: 'Claude Code', keyPrefix: 'ek_live_ab', createdAt: 'x', lastUsedAt: null, key: 'ek_live_full' });
    render(<EchoMeInClaude />);
    fireEvent.click(screen.getByRole('button', { name: 'Create key' }));
    expect(await screen.findByText(/it will not be shown again/)).toBeTruthy();
    expect(screen.getByText(/claude mcp add --transport http echome .* --header "Authorization: Bearer ek_live_full"/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByText(/ek_live_full/)).toBeNull();
  });
});
