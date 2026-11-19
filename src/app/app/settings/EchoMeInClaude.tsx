'use client';

/**
 * Settings → Connections → "EchoMe in Claude" (spec 2026-11-18 §10.1).
 * Studio only. The MCP URL to paste into Claude, how to add it, personal keys
 * for Claude Code and Cursor, and the apps the user has connected.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { extractErrorMessage } from '@/lib/error-utils';
import { ClaudeLogo } from '@/components/create/ClaudeLogo';
import {
  MCP_URL,
  claudeCodeCommand,
  createMcpKey,
  cursorConfig,
  listConnectedApps,
  listMcpKeys,
  revokeConnectedApp,
  revokeMcpKey,
  type ConnectedApp,
  type McpKey,
} from '@/lib/oauth-consent';

function formatDate(iso: string | null): string {
  if (!iso) return 'never';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function CopyField({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error('Could not copy. Select the text and copy it instead.'));
  };
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <div className="flex items-start gap-2">
        {multiline ? (
          <pre className="flex-1 min-w-0 overflow-x-auto rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-mono text-foreground">{value}</pre>
        ) : (
          <code className="flex-1 min-w-0 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-mono text-foreground">{value}</code>
        )}
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export function EchoMeInClaude() {
  const { hasTierAccess, loading: subLoading } = useSubscription();
  const studio = hasTierAccess('studio');

  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [keys, setKeys] = useState<McpKey[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!studio) return;
    let live = true;
    Promise.allSettled([listConnectedApps(), listMcpKeys()]).then(([a, k]) => {
      if (!live) return;
      if (a.status === 'fulfilled') setApps(a.value);
      if (k.status === 'fulfilled') setKeys(k.value);
    });
    return () => {
      live = false;
    };
  }, [studio]);

  const makeKey = async () => {
    setBusy(true);
    try {
      const created = await createMcpKey('Claude Code');
      setNewKey(created.key);
      setKeys(await listMcpKeys());
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not create a key.'));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (app: ConnectedApp) => {
    try {
      await revokeConnectedApp(app.id);
      setApps((prev) => prev.filter((x) => x.id !== app.id));
      toast.success(`${app.clientName} disconnected`);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not disconnect.'));
    }
  };

  const removeKey = async (key: McpKey) => {
    try {
      await revokeMcpKey(key.id);
      setKeys((prev) => prev.filter((x) => x.id !== key.id));
      toast.success('Key revoked');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not revoke the key.'));
    }
  };

  return (
    <div className="space-y-4 mt-8" id="echome-in-claude">
      <div className="flex items-start gap-3">
        <ClaudeLogo className="h-6 w-6 mt-0.5" decorative />
        <div>
          <h3 className="text-lg font-semibold text-foreground">EchoMe in Claude</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Use EchoMe from Claude: check your voice, draft posts and kits, and schedule them, without leaving the chat.
          </p>
        </div>
      </div>

      {subLoading ? null : !studio ? (
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-foreground">EchoMe in Claude is part of the Studio plan.</p>
          <Link href="/app/settings?tab=billing" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
            See plans
          </Link>
        </div>
      ) : (
        <div className="space-y-6 rounded-xl border border-border p-4">
          <CopyField label="EchoMe URL" value={MCP_URL} />

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Claude.ai, Claude Desktop and the Claude app</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
              <li>In Claude, open Settings, then Connectors.</li>
              <li>Choose Add custom connector. Name it EchoMe and paste the URL above.</li>
              <li>Select Connect, sign in to EchoMe, and choose Allow.</li>
            </ol>
            <Link href="/guides/use-echome-in-claude" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
              Read the full guide
            </Link>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-1">Claude Code and Cursor</p>
            <p className="text-sm text-muted-foreground mb-3">These connect with a personal key instead of signing in.</p>
            {newKey ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground">Your key is below. Copy it now: it will not be shown again.</p>
                <CopyField label="Claude Code (run in your terminal)" value={claudeCodeCommand(newKey)} multiline />
                <CopyField label="Cursor (add to mcp.json)" value={cursorConfig(newKey)} multiline />
                <button type="button" onClick={() => setNewKey(null)} className="text-sm font-medium text-primary hover:underline">
                  Done
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={makeKey}
                disabled={busy}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Creating...' : 'Create key'}
              </button>
            )}
            {keys.length > 0 && (
              <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                {keys.map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-foreground">
                      {k.name} <span className="font-mono text-muted-foreground">{k.keyPrefix}...</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-muted-foreground">Last used {formatDate(k.lastUsedAt)}</span>
                      <button type="button" onClick={() => removeKey(k)} className="text-xs font-medium text-destructive hover:underline">
                        Revoke
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Connected apps</p>
            {apps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No apps connected yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {apps.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-foreground">{a.clientName}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        Connected {formatDate(a.createdAt)} · last used {formatDate(a.lastUsedAt)}
                      </span>
                      <button type="button" onClick={() => disconnect(a)} className="text-xs font-medium text-destructive hover:underline">
                        Disconnect
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
