'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
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
} from 'lucide-react';

// Platform config for display
const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', Icon: Instagram },
  { id: 'linkedin', name: 'LinkedIn', Icon: Linkedin },
  { id: 'twitter', name: 'X (Twitter)', Icon: Twitter },
  { id: 'facebook', name: 'Facebook', Icon: Facebook },
  { id: 'tiktok', name: 'TikTok', Icon: Music2 },
  { id: 'threads', name: 'Threads', Icon: AtSign },
  { id: 'youtube', name: 'YouTube', Icon: Youtube },
  { id: 'bluesky', name: 'Bluesky', Icon: CloudSun },
  { id: 'pinterest', name: 'Pinterest', Icon: Pin },
] as const;

interface ConnectedAccount {
  id: string;
  outstandAccountId: string;
  platform: string;
  platformUsername: string;
  platformAvatarUrl: string | null;
  connectedAt: string;
}

export function ConnectedAccounts() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const response = await api.socialPosting.listAccounts();
      if (response.success && response.data) {
        setAccounts(response.data.accounts);
      }
    } catch (error) {
      console.error('Failed to load connected accounts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'social-account-connected') {
        toast.success(`${event.data.platform} connected successfully!`);
        setConnecting(null);
        loadAccounts();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadAccounts]);

  const handleConnect = async (platform: string) => {
    try {
      setConnecting(platform);
      const response = await api.socialPosting.getAuthUrl(platform);
      if (response.success && response.data?.url) {
        // Open OAuth in popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(
          response.data.url,
          'social-connect',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    } catch (error) {
      toast.error('Failed to start connection. Please try again.');
      setConnecting(null);
    }
  };

  const handleDisconnect = async (account: ConnectedAccount) => {
    try {
      setDisconnecting(account.id);
      await api.socialPosting.disconnectAccount(account.id);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      toast.success(`${account.platform} disconnected`);
    } catch (error) {
      toast.error('Failed to disconnect account');
    } finally {
      setDisconnecting(null);
    }
  };

  const connectedPlatformIds = new Set(accounts.map((a) => a.platform));

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-subheading text-xl mb-4">Connected Accounts</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected accounts */}
      <div className="card">
        <h3 className="text-subheading text-xl mb-2">Connected Accounts</h3>
        <p className="text-body text-text-secondary mb-4">
          Connect your social media accounts to schedule and auto-post content directly from EchoMe.
        </p>

        {accounts.length > 0 && (
          <div className="space-y-3 mb-6">
            {accounts.map((account) => {
              const platformConfig = PLATFORMS.find((p) => p.id === account.platform);
              const PlatformIcon = platformConfig?.Icon;
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {account.platformAvatarUrl ? (
                      <img
                        src={account.platformAvatarUrl}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    ) : PlatformIcon ? (
                      <PlatformIcon className="w-6 h-6 text-text-secondary" />
                    ) : (
                      <span className="w-6 h-6 rounded bg-bg-tertiary" />
                    )}
                    <div>
                      <div className="font-medium text-text-primary">
                        {platformConfig?.name || account.platform}
                      </div>
                      <div className="text-sm text-text-secondary">
                        {account.platformUsername}
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Connected
                    </span>
                  </div>
                  <button
                    onClick={() => handleDisconnect(account)}
                    disabled={disconnecting === account.id}
                    className="p-2 text-text-secondary hover:text-error transition-colors disabled:opacity-50"
                    title="Disconnect"
                  >
                    {disconnecting === account.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Available platforms to connect */}
        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-3">
            {accounts.length > 0 ? 'Add more accounts' : 'Connect a platform to get started'}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PLATFORMS.filter((p) => !connectedPlatformIds.has(p.id)).map((platform) => {
              const PlatformIcon = platform.Icon;
              return (
                <button
                  key={platform.id}
                  onClick={() => handleConnect(platform.id)}
                  disabled={connecting === platform.id}
                  className="flex items-center gap-2 p-3 border border-border rounded-lg hover:bg-bg-secondary transition-colors disabled:opacity-50"
                >
                  {connecting === platform.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <PlatformIcon className="w-5 h-5 text-text-secondary" />
                  )}
                  <span className="text-sm font-medium text-text-primary">
                    {platform.name}
                  </span>
                  <Plus className="w-3 h-3 text-text-secondary ml-auto" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
