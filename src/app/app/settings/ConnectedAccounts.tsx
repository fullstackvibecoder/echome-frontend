'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
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
  Youtube,
  Twitter,
  Facebook,
  Music2,
  AtSign,
  CloudSun,
  Pin,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';

// Platforms verified working with Outstand managed keys
const PLATFORMS: Array<{ id: string; name: string; Icon: LucideIcon; hint?: string }> = [
  { id: 'instagram', name: 'Instagram', Icon: Instagram, hint: 'Business or Creator account' },
  { id: 'linkedin', name: 'LinkedIn', Icon: Linkedin, hint: 'Requires a Company Page' },
  // Facebook/Threads — managed keys work but page connection flow needs verification
  // { id: 'facebook', name: 'Facebook', Icon: Facebook, hint: 'Requires a Facebook Page' },
  // { id: 'threads', name: 'Threads', Icon: AtSign },
  // Pending Outstand managed keys:
  // { id: 'x', name: 'X (Twitter)', Icon: Twitter },
  // { id: 'tiktok', name: 'TikTok', Icon: Music2 },
  // { id: 'youtube', name: 'YouTube', Icon: Youtube },
  // { id: 'bluesky', name: 'Bluesky', Icon: CloudSun },
  // { id: 'pinterest', name: 'Pinterest', Icon: Pin },
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
  const { hasTierAccess } = useSubscription();
  const canAutoPost = hasTierAccess('studio');

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

  // Listen for OAuth popup close
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

  // Close dropdown on outside click
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

        // Fallback: poll for popup close (in case postMessage doesn't fire cross-origin)
        if (popup) {
          const pollTimer = setInterval(() => {
            if (popup.closed) {
              clearInterval(pollTimer);
              setConnecting(null);
              loadAccounts(); // Refresh — account may have been saved
            }
          }, 1000);
          // Clean up after 5 minutes max
          setTimeout(() => clearInterval(pollTimer), 300000);
        }
      } else {
        toast.error('Could not get authorization URL. Please try again.');
        setConnecting(null);
      }
    } catch {
      toast.error('Failed to start connection. Please try again.');
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
    } catch {
      toast.error('Failed to disconnect');
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
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Auto-Post to Instagram</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule your content and EchoMe posts it automatically. No more copy-pasting — your content goes live on Instagram at the time you choose.
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 text-center space-y-3">
          <p className="text-sm text-foreground font-medium">Available on Echo Studio and above</p>
          <p className="text-xs text-muted-foreground">Upgrade to connect your Instagram account and start auto-posting directly from your content kits.</p>
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
        <h3 className="text-lg font-semibold text-foreground">Auto-Post to Instagram</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your Instagram account to schedule and auto-post content directly from EchoMe.
        </p>
      </div>

      {/* Connected accounts list */}
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
                >
                  {disconnecting === account.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Single "Connect Account" button with dropdown */}
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
            <div className="absolute top-full left-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
              {availablePlatforms.map((platform) => {
                const Icon = platform.Icon;
                return (
                  <button
                    key={platform.id}
                    onClick={(e) => { e.stopPropagation(); handleConnect(platform.id); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-background transition-colors text-left"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div>{platform.name}</div>
                      {platform.hint && <div className="text-[10px] text-muted-foreground/60">{platform.hint}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* All connected */}
      {accounts.length > 0 && availablePlatforms.length === 0 && (
        <p className="text-xs text-muted-foreground">All platforms connected.</p>
      )}
    </div>
  );
}
