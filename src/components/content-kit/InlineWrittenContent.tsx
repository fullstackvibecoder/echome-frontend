'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Linkedin,
  Twitter,
  Mail,
  Music2,
  Youtube,
  FileText,
  Save,
  RefreshCw,
  Copy,
  Check,
  CalendarClock,
  Clapperboard,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { copyAsPlainText } from '@/lib/clipboard';
import { FeedbackThumbs } from '@/components/feedback-thumbs';
import { TeleprompterModal } from '@/components/teleprompter/TeleprompterModal';
import { WrittenPostActions } from './WrittenPostActions';

interface PlatformConfig {
  key: string;
  label: string;
  field: string;
  icon: LucideIcon;
  accent: string;
  charLimit: number | null;
}

// Instagram is intentionally absent. IG posts require media (carousel or
// reel), so the caption is edited next to the asset that carries it — see
// PostCaptionBlock inside CarouselEditorModal. A "written" tab for IG with
// no Post button was confusing users into thinking the platform was broken.
const PLATFORMS: PlatformConfig[] = [
  { key: 'linkedin', label: 'LinkedIn', field: 'contentLinkedin', icon: Linkedin, accent: '#0A66C2', charLimit: 3000 },
  { key: 'twitter', label: 'Twitter/X', field: 'contentTwitter', icon: Twitter, accent: '#1DA1F2', charLimit: 280 },
  { key: 'email', label: 'Email', field: 'contentEmail', icon: Mail, accent: '#0077AA', charLimit: null },
  { key: 'tiktok', label: 'TikTok', field: 'contentTiktok', icon: Music2, accent: '#000000', charLimit: 2200 },
  { key: 'youtube', label: 'YouTube', field: 'contentYoutube', icon: Youtube, accent: '#FF0000', charLimit: 5000 },
  { key: 'video-script', label: 'Video Script', field: 'contentVideoScript', icon: Clapperboard, accent: '#8B5CF6', charLimit: null },
];

const FIELD_MAP: Record<string, string> = {
  linkedin: 'contentLinkedin',
  twitter: 'contentTwitter',
  email: 'contentEmail',
  tiktok: 'contentTiktok',
  youtube: 'contentYoutube',
  'video-script': 'contentVideoScript',
};

// Tabs that get the "Record with Teleprompter" CTA. Limited to script-shaped
// content; LinkedIn/IG/Twitter/Email don't read aloud as cleanly.
const TELEPROMPTER_PLATFORMS = new Set(['video-script', 'youtube', 'tiktok']);

// Platform-key map: InlineWrittenContent uses 'twitter', WrittenPostActions
// uses 'x' (Outstand's API key for the same platform). Missing entries
// (email, video-script) fall through to a calendar Schedule button.
const POST_ACTION_PLATFORM_MAP: Record<string, string> = {
  linkedin: 'linkedin',
  twitter: 'x',
  tiktok: 'tiktok',
};

interface InlineWrittenContentProps {
  contentKitId: string;
  /** Optional kit title — used as the recording filename when the user records via teleprompter. */
  contentKitTitle?: string;
  /** Optional KB id — when set, teleprompter recordings get ingested as voice samples. */
  knowledgeBaseId?: string;
  content: Record<string, string | undefined>;
  /** Per-platform generated_content.id, used as feedback target. Missing platforms hide the thumbs. */
  platformIds?: Record<string, string | undefined>;
  onContentUpdate: () => void;
  onSchedule?: (platform: string) => void;
}

export function InlineWrittenContent({
  contentKitId,
  contentKitTitle,
  knowledgeBaseId,
  content,
  platformIds,
  onContentUpdate,
  onSchedule,
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
  const [teleprompterOpen, setTeleprompterOpen] = useState(false);

  // Per-platform connection state for WrittenPostActions. Fetched once on
  // mount; if the user connects an account in another tab, they'll need to
  // refresh to see the Post Now button enable. That's fine — connections
  // change rarely and the alternative (subscribing to changes) is overkill.
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    api.socialPosting.listAccounts()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data?.accounts) {
          setConnectedPlatforms(new Set(res.data.accounts.map(a => a.platform)));
        }
      })
      .catch(() => { /* silent — Post Now will just be disabled */ });
    return () => { cancelled = true; };
  }, []);

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

        {/* Footer: char count + feedback + actions */}
        <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`text-[11px] ${
                isOverLimit ? 'text-red-400 font-medium' : 'text-muted-foreground/50'
              }`}
            >
              {charCount}
              {activeConfig.charLimit ? ` / ${activeConfig.charLimit}` : ''} characters
            </span>
            {platformIds?.[activePlatform] && (
              <FeedbackThumbs
                key={`thumbs-${activePlatform}-${platformIds[activePlatform]}`}
                contentId={platformIds[activePlatform]!}
                label="On voice?"
                compact
              />
            )}
          </div>

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
            {TELEPROMPTER_PLATFORMS.has(activePlatform) && activeText.trim() && (
              <button
                onClick={() => setTeleprompterOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
                title="Read this script with a built-in teleprompter and record with your camera"
              >
                <Video className="w-3 h-3" />
                Record with Teleprompter
              </button>
            )}
            {/* Post Now + Schedule for postable platforms. WrittenPostActions
                handles the api/link mode split internally (auto-post for
                connected IG/LI/FB/Threads; copy-and-open compose for X/
                TikTok). Tier fallback: when canAutoPost is false,
                the Schedule button becomes a calendar reminder.
                For platforms not in the map (email, video-script, youtube),
                fall back to a plain Schedule button that opens the kit-level
                calendar reminder flow. (YouTube is video-only via Outstand —
                clips post as Shorts — so its written tab just sets a reminder.) */}
            {POST_ACTION_PLATFORM_MAP[activePlatform] ? (
              <WrittenPostActions
                platform={POST_ACTION_PLATFORM_MAP[activePlatform]}
                contentKitId={contentKitId}
                text={activeText}
                connected={connectedPlatforms.has(POST_ACTION_PLATFORM_MAP[activePlatform])}
              />
            ) : onSchedule ? (
              <button
                onClick={() => onSchedule(activePlatform)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
                title="Add a calendar reminder for this content"
              >
                <CalendarClock className="w-3 h-3" />
                Schedule
              </button>
            ) : null}
          </div>
        </div>

      </div>

      <TeleprompterModal
        open={teleprompterOpen}
        onClose={() => setTeleprompterOpen(false)}
        script={editedTexts[activePlatform] || ''}
        contentKitId={contentKitId}
        contentKitTitle={contentKitTitle}
        knowledgeBaseId={knowledgeBaseId}
        onRecordingUploaded={onContentUpdate}
      />
    </div>
  );
}
