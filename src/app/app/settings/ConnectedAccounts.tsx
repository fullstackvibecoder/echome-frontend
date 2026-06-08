'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';
import {
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
  Instagram,
  Linkedin,
  Facebook,
  AtSign,
  Youtube,
  Cloud,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';

// Platforms verified working with Outstand managed keys.
// IG/LI/FB/Threads went live in the original 2026-04-19 rollout (3-leg flow
// for FB/Threads, verified 2026-04-23). YouTube/Bluesky managed keys went
// live 2026-05-09 — verified end-to-end via /v1/social-networks/{platform}/auth-url
// returning valid OAuth URLs for both. Pinterest is also managed but held
// from this UI until we wire the post-side (pins need media + destination URL,
// which doesn't slot into the kit content shape yet). X, TikTok, Google Business
// remain BYOK-only and aren't expected to land soon.
const PLATFORMS: Array<{ id: string; name: string; Icon: LucideIcon; hint?: string }> = [
  { id: 'instagram', name: 'Instagram', Icon: Instagram, hint: 'Requires a Business or Creator account' },
  { id: 'linkedin', name: 'LinkedIn', Icon: Linkedin, hint: 'Personal profile or Company Page both work' },
  { id: 'facebook', name: 'Facebook', Icon: Facebook, hint: 'Requires a Facebook Page (Meta does not allow API posting to personal profiles)' },
  { id: 'threads', name: 'Threads', Icon: AtSign, hint: 'Requires an Instagram Business/Creator account linked to Threads' },
  { id: 'youtube', name: 'YouTube', Icon: Youtube, hint: 'Publishes vertical clips as YouTube Shorts' },
  { id: 'bluesky', name: 'Bluesky', Icon: Cloud, hint: 'Short-form posts up to 300 characters' },
];

interface ConnectedAccount {
  id: string;
  outstandAccountId: string;
  platform: string;
  platformUsername: string;
  platformAvatarUrl: string | null;
  connectedAt: string;
}

export function ConnectedAccounts() {
  const { canAutoPost, autoPostBlockedReason } = useSubscription();

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const response = await api.socialPosting.listAccounts();
      if (response.success && response.data) {
        setAccounts(response.data.accounts);
      }
    } catch {
      // Non-critical — page still works without accounts
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'social-account-connected') {
        toast.success(`${event.data.platform} connected!`);
        setConnecting(null);
        setDropdownOpen(false);
        loadAccounts();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadAccounts]);

  // While a connect is in flight, poll the account list every 2.5s. postMessage
  // and popup-close detection are both unreliable once the popup has crossed
  // origins (Outstand → LinkedIn → our callback — COOP can sever window.opener).
  // Polling the server state is the one reliable signal. Stops the moment
  // connecting resets or after 3 minutes.
  useEffect(() => {
    if (!connecting) return;
    const startCount = accounts.length;
    const poll = setInterval(async () => {
      try {
        const resp = await api.socialPosting.listAccounts();
        if (resp.success && resp.data && resp.data.accounts.length > startCount) {
          setAccounts(resp.data.accounts);
          setConnecting(null);
          setDropdownOpen(false);
          toast.success(`${connecting} connected!`);
        }
      } catch {
        // transient — keep polling
      }
    }, 2500);
    const stop = setTimeout(() => clearInterval(poll), 180_000);
    return () => { clearInterval(poll); clearTimeout(stop); };
  }, [connecting, accounts.length]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const close = () => setDropdownOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [dropdownOpen]);

  const handleConnect = async (platform: string) => {
    try {
      setConnecting(platform);
      setDropdownOpen(false);
      const response = await api.socialPosting.getAuthUrl(platform);
      if (response.success && response.data?.url) {
        const w = 600, h = 700;
        const left = window.screenX + (window.outerWidth - w) / 2;
        const top = window.screenY + (window.outerHeight - h) / 2;
        const popup = window.open(response.data.url, 'social-connect', `width=${w},height=${h},left=${left},top=${top}`);

        // Fallback: poll for popup close (cross-origin postMessage can be unreliable)
        if (popup) {
          const pollTimer = setInterval(() => {
            if (popup.closed) {
              clearInterval(pollTimer);
              setConnecting(null);
              loadAccounts();
            }
          }, 1000);
          setTimeout(() => clearInterval(pollTimer), 300000);
        }
      } else {
        toast.error('Could not get authorization URL. Please try again.');
        setConnecting(null);
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to start connection. Please try again.'));
      setConnecting(null);
    }
  };

  const handleDisconnect = async (account: ConnectedAccount) => {
    try {
      setDisconnecting(account.id);
      await api.socialPosting.disconnectAccount(account.id);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      const name = PLATFORMS.find(p => p.id === account.platform)?.name || account.platform;
      toast.success(`${name} disconnected`);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to disconnect your account. Please try again.'));
    } finally {
      setDisconnecting(null);
    }
  };

  const connectedIds = new Set(accounts.map((a) => a.platform));
  const availablePlatforms = PLATFORMS.filter((p) => !connectedIds.has(p.id));

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Connected Accounts</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!canAutoPost) {
    // Messaging varies by why the user is blocked — Echo users don't need to
    // be told they're "not subscribed", and free-exhausted users have a
    // different upgrade framing than a genuinely signed-out visitor.
    const [headline, subcopy] = (() => {
      switch (autoPostBlockedReason) {
        case 'echo-tier':
          return [
            'Available on Echo Studio, Echo Pro, and Teams',
            'Your Echo plan can still schedule posts on the calendar — we\'ll email you the copy-ready content at the scheduled time.',
          ];
        case 'free-exhausted':
          return [
            'Your free content kits are used up',
            'Upgrade to Echo Studio or above to connect your accounts and auto-post. Your Echo plan alternative uses scheduled email reminders.',
          ];
        case 'no-subscription':
        default:
          return [
            'Connect your accounts and auto-post',
            'Free plan includes full auto-post access during your 5 content kits. Upgrade any time to keep going.',
          ];
      }
    })();

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Auto-Post to Social</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule your content and let EchoMe post it automatically to Instagram, LinkedIn, Facebook, and Threads.
          </p>
        </div>
        <div
          className="bg-card border border-border rounded-xl p-5 text-center space-y-3 opacity-70 cursor-not-allowed"
          title={headline}
        >
          <p className="text-sm text-foreground font-medium">{headline}</p>
          <p className="text-xs text-muted-foreground">{subcopy}</p>
          <Link
            href="/app/billing"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-interactive text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Auto-Post to Social</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your social accounts to schedule and auto-post content directly from EchoMe.
        </p>
        <p className="text-[11px] text-muted-foreground/60 mt-2">
          Available now: Instagram, LinkedIn, Facebook, Threads, YouTube, Bluesky.
        </p>
      </div>

      {accounts.length > 0 && (
        <div className="space-y-2">
          {accounts.map((account) => {
            const config = PLATFORMS.find((p) => p.id === account.platform);
            const Icon = config?.Icon;
            return (
              <div key={account.id} className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl">
                <div className="flex items-center gap-3">
                  {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
                  <div>
                    <span className="text-sm font-medium text-foreground">{config?.name || account.platform}</span>
                    {account.platformUsername && (
                      <span className="text-xs text-muted-foreground ml-2">@{account.platformUsername}</span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Connected
                  </span>
                </div>
                <button
                  onClick={() => handleDisconnect(account)}
                  disabled={disconnecting === account.id}
                  className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                  aria-label={`Disconnect ${config?.name || account.platform}`}
                >
                  {disconnecting === account.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {availablePlatforms.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
            disabled={!!connecting}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-interactive text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting {PLATFORMS.find(p => p.id === connecting)?.name}...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Connect Account
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
              {availablePlatforms.map((platform) => {
                const Icon = platform.Icon;
                return (
                  <button
                    key={platform.id}
                    onClick={(e) => { e.stopPropagation(); handleConnect(platform.id); }}
                    className="flex items-start gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-background transition-colors text-left"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <div>{platform.name}</div>
                      {platform.hint && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{platform.hint}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {accounts.length > 0 && availablePlatforms.length === 0 && (
        <p className="text-xs text-muted-foreground">All available platforms connected.</p>
      )}
    </div>
  );
}
