'use client';

import { useState, useMemo } from 'react';
import {
  Linkedin,
  Instagram,
  Twitter,
  Mail,
  Music2,
  Youtube,
  FileText,
  Save,
  RefreshCw,
  Copy,
  Check,
  Send,
  CalendarClock,
  ExternalLink,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { copyAsPlainText } from '@/lib/clipboard';
import { toast } from 'sonner';

interface PlatformConfig {
  key: string;
  label: string;
  field: string;
  icon: LucideIcon;
  accent: string;
  charLimit: number | null;
}

const PLATFORMS: PlatformConfig[] = [
  { key: 'linkedin', label: 'LinkedIn', field: 'contentLinkedin', icon: Linkedin, accent: '#0A66C2', charLimit: 3000 },
  { key: 'instagram', label: 'Instagram', field: 'contentInstagram', icon: Instagram, accent: '#E4405F', charLimit: 2200 },
  { key: 'twitter', label: 'Twitter/X', field: 'contentTwitter', icon: Twitter, accent: '#1DA1F2', charLimit: 280 },
  { key: 'email', label: 'Email', field: 'contentEmail', icon: Mail, accent: '#0077AA', charLimit: null },
  { key: 'tiktok', label: 'TikTok', field: 'contentTiktok', icon: Music2, accent: '#000000', charLimit: 2200 },
  { key: 'youtube', label: 'YouTube', field: 'contentYoutube', icon: Youtube, accent: '#FF0000', charLimit: 5000 },
];

const FIELD_MAP: Record<string, string> = {
  linkedin: 'contentLinkedin',
  twitter: 'contentTwitter',
  instagram: 'contentInstagram',
  email: 'contentEmail',
  tiktok: 'contentTiktok',
  youtube: 'contentYoutube',
};

interface ConnectedAccount {
  platform: string;
  id: string;
}

interface InlineWrittenContentProps {
  contentKitId: string;
  content: Record<string, string | undefined>;
  onContentUpdate: () => void;
  connectedAccounts?: ConnectedAccount[];
}

export function InlineWrittenContent({
  contentKitId,
  content,
  onContentUpdate,
  connectedAccounts = [],
}: InlineWrittenContentProps) {
  // Only show platforms that have content
  const availablePlatforms = useMemo(
    () => PLATFORMS.filter((p) => content[p.key]?.trim()),
    [content]
  );

  const [activePlatform, setActivePlatform] = useState(
    availablePlatforms[0]?.key || 'linkedin'
  );
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of PLATFORMS) {
      if (content[p.key]) init[p.key] = content[p.key]!;
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoPostOpen, setAutoPostOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduling, setScheduling] = useState(false);

  if (availablePlatforms.length === 0) return null;

  const activeConfig = PLATFORMS.find((p) => p.key === activePlatform) || PLATFORMS[0];
  const activeText = editedTexts[activePlatform] || '';
  const charCount = activeText.length;
  const isOverLimit = activeConfig.charLimit ? charCount > activeConfig.charLimit : false;

  const handleSave = async () => {
    setSaving(true);
    try {
      const fieldName = FIELD_MAP[activePlatform];
      if (fieldName) {
        await api.contentKits.update(contentKitId, { [fieldName]: activeText } as any);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to save', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const result = await api.contentKits.regenerate(contentKitId, {
        platforms: [activePlatform],
      });
      if (result.success && result.data?.kit) {
        const newContent = (result.data.kit as any)[activeConfig.field];
        if (newContent) {
          setEditedTexts((prev) => ({ ...prev, [activePlatform]: newContent }));
        }
      }
      onContentUpdate();
    } catch (err) {
      console.error('Failed to regenerate', err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = async () => {
    await copyAsPlainText(activeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const AUTO_POST_PLATFORMS = ['instagram', 'linkedin'];
  const supportsAutoPost = AUTO_POST_PLATFORMS.includes(activePlatform);
  const isConnected = connectedAccounts.some((a) => a.platform === activePlatform);

  const handleSchedulePost = async () => {
    if (!scheduledAt) return;
    setScheduling(true);
    try {
      const isoDate = new Date(scheduledAt).toISOString();
      await api.socialPosting.schedule({
        contentKitId,
        platform: activePlatform,
        text: activeText,
        scheduledAt: isoDate,
      });
      const displayDate = new Date(scheduledAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      toast.success(`Scheduled for ${displayDate} on ${activeConfig.label}`);
      setAutoPostOpen(false);
      setScheduledAt('');
    } catch (err) {
      console.error('Failed to schedule post', err);
      toast.error('Failed to schedule post');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-soft)' }}>
      {/* Platform tabs */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border bg-surface-container-lowest overflow-x-auto scrollbar-hide">
        {availablePlatforms.map((p) => {
          const Icon = p.icon;
          const isActive = activePlatform === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setActivePlatform(p.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                isActive
                  ? 'text-white'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              }`}
              style={isActive ? { backgroundColor: p.accent } : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Content editor */}
      <div className="p-3">
        <textarea
          value={activeText}
          onChange={(e) =>
            setEditedTexts((prev) => ({ ...prev, [activePlatform]: e.target.value }))
          }
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-interactive/50 resize-none"
          rows={6}
        />

        {/* Footer: char count + actions */}
        <div className="flex items-center justify-between mt-2">
          <span
            className={`text-[11px] ${
              isOverLimit ? 'text-red-400 font-medium' : 'text-muted-foreground/50'
            }`}
          >
            {charCount}
            {activeConfig.charLimit ? ` / ${activeConfig.charLimit}` : ''} characters
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-interactive text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
              {saved ? 'Saved' : saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => setAutoPostOpen(!autoPostOpen)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                autoPostOpen
                  ? 'bg-accent text-white'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <Send className="w-3 h-3" />
              Auto Post
            </button>
          </div>
        </div>

        {/* Auto Post inline section */}
        {autoPostOpen && (
          <div className="mt-2 p-3 bg-surface-container-lowest rounded-lg border border-border">
            {!supportsAutoPost ? (
              <p className="text-xs text-muted-foreground">
                Auto-posting to {activeConfig.label} is coming soon. Available now for Instagram and LinkedIn.
              </p>
            ) : isConnected ? (
              <div className="flex items-center gap-2 flex-wrap">
                <CalendarClock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="flex-1 min-w-[180px] px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary-interactive/50"
                />
                <button
                  onClick={handleSchedulePost}
                  disabled={!scheduledAt || scheduling}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-interactive text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {scheduling ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  {scheduling ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Connect {activeConfig.label} to auto-post.</span>
                <Link
                  href="/app/settings?tab=connections"
                  className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
                >
                  Connect <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
