'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Loader2, Check, Copy, RefreshCw, Save } from 'lucide-react';
import { copyAsPlainText } from '@/lib/clipboard';
import api from '@/lib/api-client';
import { analyzeText, type HemingwayAnalysis } from '@/lib/hemingway';
import { HemingwayPanel, HemingwayGradeBadge } from '@/components/email-editor/HemingwayPanel';

const HEMINGWAY_PLATFORMS = new Set(['linkedin', 'twitter', 'instagram', 'tiktok']);
const HEMINGWAY_DEBOUNCE_MS = 500;

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  twitter: 'Twitter/X',
  email: 'Email',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  videoScript: 'Video Script',
};

const PLATFORM_LIMITS: Record<string, number | null> = {
  linkedin: 3000,
  twitter: 280,
  instagram: 2200,
  email: null,
  tiktok: 2200,
  youtube: 5000,
  videoScript: null,
};

const FIELD_MAP: Record<string, string> = {
  linkedin: 'contentLinkedin',
  twitter: 'contentTwitter',
  instagram: 'contentInstagram',
  email: 'contentEmail',
  tiktok: 'contentTiktok',
  youtube: 'contentYoutube',
  videoScript: 'contentVideoScript',
};

// Tab ordering
const PLATFORM_ORDER = ['linkedin', 'instagram', 'twitter', 'email', 'tiktok', 'youtube'] as const;

interface WrittenContentModalProps {
  open: boolean;
  onClose: () => void;
  contentKitId: string;
  content: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    email?: string;
    tiktok?: string;
    youtube?: string;
    videoScript?: string;
  };
  onContentUpdate: () => void;
}

export default function WrittenContentModal({
  open,
  onClose,
  contentKitId,
  content,
  onContentUpdate,
}: WrittenContentModalProps) {
  // Compute which platforms have content
  const availablePlatforms = useMemo(() => {
    return PLATFORM_ORDER.filter((p) => content[p] != null && content[p] !== '');
  }, [content]);

  const [activePlatform, setActivePlatform] = useState<string>('');
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hemingway, setHemingway] = useState<HemingwayAnalysis | null>(null);

  const backdropRef = useRef<HTMLDivElement>(null);

  // Initialize state when modal opens or content changes
  useEffect(() => {
    if (open) {
      const texts: Record<string, string> = {};
      for (const platform of PLATFORM_ORDER) {
        if (content[platform] != null) {
          texts[platform] = content[platform] ?? '';
        }
      }
      setEditedTexts(texts);

      // Default to first available platform
      const first = PLATFORM_ORDER.find((p) => content[p] != null && content[p] !== '');
      if (first) {
        setActivePlatform(first);
      }
    }
  }, [open, content]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === backdropRef.current) onClose();
    },
    [onClose]
  );

  const currentText = editedTexts[activePlatform] ?? '';
  const charCount = currentText.length;
  const limit = PLATFORM_LIMITS[activePlatform] ?? null;
  const isOverLimit = limit !== null && charCount > limit;
  const showHemingway = HEMINGWAY_PLATFORMS.has(activePlatform);

  useEffect(() => {
    if (!showHemingway) {
      setHemingway(null);
      return;
    }
    const handle = window.setTimeout(() => {
      setHemingway(analyzeText(currentText));
    }, HEMINGWAY_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [currentText, showHemingway]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditedTexts((prev) => ({
        ...prev,
        [activePlatform]: e.target.value,
      }));
    },
    [activePlatform]
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const fieldName = FIELD_MAP[activePlatform];
      await api.contentKits.update(contentKitId, {
        [fieldName]: currentText,
      } as Record<string, string>);
      onContentUpdate();
    } catch (err) {
      console.error('Failed to save', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await api.contentKits.regenerate(contentKitId, {
        platforms: [activePlatform],
      });
      const newKit = res.data?.kit;
      if (newKit) {
        // Update the edited text from the regenerated kit
        const fieldName = FIELD_MAP[activePlatform];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newValue = (newKit as any)[fieldName];
        if (typeof newValue === 'string') {
          setEditedTexts((prev) => ({
            ...prev,
            [activePlatform]: newValue,
          }));
        }
      }
      onContentUpdate();
    } catch (err) {
      console.error('Regeneration failed', err);
      setError('Regeneration failed. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = async () => {
    const success = await copyAsPlainText(currentText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative flex flex-col w-full max-w-[700px] max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-lg font-semibold text-foreground">Written Content</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Platform tabs */}
        <div className="flex gap-2 overflow-x-auto px-6 pt-4 pb-2 scrollbar-none">
          {availablePlatforms.map((platform) => (
            <button
              key={platform}
              type="button"
              onClick={() => setActivePlatform(platform)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                activePlatform === platform
                  ? 'bg-primary-interactive text-white'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {PLATFORM_LABELS[platform] ?? platform}
              {content[platform] && (
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    activePlatform === platform ? 'bg-white/60' : 'bg-primary-interactive/60'
                  }`}
                />
              )}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <textarea
            value={currentText}
            onChange={handleTextChange}
            className="w-full min-h-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-interactive/50 resize-y"
          />
          <div className="mt-1 flex justify-between items-center gap-3">
            <p className={`text-xs ${isOverLimit ? 'text-red-400' : 'text-muted-foreground'}`}>
              {charCount} characters
              {limit !== null && ` / ${limit}`}
            </p>
            {showHemingway && <HemingwayGradeBadge analysis={hemingway} />}
          </div>
          {showHemingway && <HemingwayPanel analysis={hemingway} />}
        </div>

        {/* Error */}
        {error && (
          <div className="px-6">
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
              {error}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-primary-interactive px-3 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>

          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Regenerate
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-card transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
