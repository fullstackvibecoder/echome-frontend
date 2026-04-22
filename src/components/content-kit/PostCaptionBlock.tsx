'use client';

/**
 * PostCaptionBlock
 *
 * Displays a contextual post caption for a visual output (clip, carousel,
 * reel). Single Copy button — no duplicate platform share button, because
 * Instagram (the primary target for these visual outputs) has no web text
 * intent URL and would behave identically to Copy, confusing users.
 *
 * For per-platform Post buttons with real intent URLs (LinkedIn, X,
 * Threads, Facebook), see InlineWrittenContent which handles the written
 * platform tabs where those URLs actually do something distinct.
 *
 * Falls back to a kit-level caption when the per-output caption hasn't
 * been generated yet, with a small note so the user knows it's shared.
 */
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

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
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy caption'}
        </button>
      </div>
      {/* No height cap — parent modal column handles overflow scroll.
          Caps that silently clip text were confusing users. */}
      <div className="bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {text}
      </div>
    </div>
  );
}

export default PostCaptionBlock;
