'use client';

/**
 * PostCaptionBlock
 *
 * Displays a contextual post caption for a visual output (clip, carousel,
 * reel). Two actions: Copy caption (clipboard only) and Open Instagram
 * (copies + opens instagram.com in a new tab). The latter gives a one-click
 * path from caption to IG — on mobile with the IG app installed it deep-links
 * into the app via iOS universal links / Android app links; on desktop it
 * opens the web composer. Either way the caption is on the clipboard ready
 * to paste.
 *
 * For per-platform Post buttons with real pre-fill intent URLs (LinkedIn, X,
 * Threads, Facebook), see InlineWrittenContent which handles the written
 * platform tabs where those URLs populate the composer text directly.
 *
 * Falls back to a kit-level caption when the per-output caption hasn't
 * been generated yet, with a small note so the user knows it's shared.
 */
import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

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

  // Copies caption then opens Instagram in a new tab. On mobile with the IG
  // app installed this deep-links into the app via iOS universal links / Android
  // app links; on desktop it opens the web composer. Either way the user has
  // the caption ready to paste.
  const handleOpenInstagram = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    window.open('https://www.instagram.com', '_blank', 'noopener,noreferrer');
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy caption'}
          </button>
          <button
            type="button"
            onClick={handleOpenInstagram}
            title="Copies the caption and opens Instagram in a new tab"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-gradient-to-r from-purple-600 via-red-500 to-orange-400 hover:opacity-90 transition-opacity"
          >
            <span aria-hidden>📸</span>
            Open Instagram
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
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
