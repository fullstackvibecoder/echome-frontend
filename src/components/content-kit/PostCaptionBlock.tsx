'use client';

/**
 * PostCaptionBlock
 *
 * Displays a contextual post caption for a visual output (carousel, reel)
 * with Copy + direct-to-Instagram share buttons. Falls back to a kit-level
 * caption when the per-output caption hasn't been generated yet, with a
 * small note so the user knows it's shared.
 *
 * Used from: CarouselEditorModal, ReelEditorModal.
 */
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { QuickShareButton } from '@/components/share-buttons';

interface PostCaptionBlockProps {
  /** Preferred caption (per-output). If null/empty, fallback is used. */
  caption?: string | null;
  /** Fallback caption (kit-level content_instagram). Shown with a note. */
  fallback?: string | null;
  /** Optional label override (default: "Post caption") */
  label?: string;
}

export function PostCaptionBlock({ caption, fallback, label = 'Post caption' }: PostCaptionBlockProps) {
  const [copied, setCopied] = useState(false);

  const text = caption?.trim() || fallback?.trim() || '';
  const isFallback = !caption?.trim() && !!fallback?.trim();

  if (!text) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-sm font-medium text-foreground">
          {label}
          {isFallback && (
            <span className="text-[11px] text-muted-foreground/70 font-normal ml-1.5">
              (from kit default)
            </span>
          )}
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <QuickShareButton content={text} platformKey="instagram" />
        </div>
      </div>
      <div className="bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
        {text}
      </div>
    </div>
  );
}

export default PostCaptionBlock;
