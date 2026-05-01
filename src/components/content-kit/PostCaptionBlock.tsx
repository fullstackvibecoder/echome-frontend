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
 * Editable mode (caller passes onChange): the caption renders as a textarea
 * and the parent persists changes (debounced) — same UX as InlineWrittenContent
 * for the written platforms, so visual + written caption editing behave the
 * same way across the app.
 *
 * Falls back to a kit-level caption when the per-output caption hasn't
 * been generated yet, with a small note so the user knows it's shared.
 */
import { useState, useEffect, useRef } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface PostCaptionBlockProps {
  /** Preferred caption (per-output). If null/empty, fallback is used. */
  caption?: string | null;
  /** Fallback caption (kit-level content_instagram). Shown with a note. */
  fallback?: string | null;
  /** Optional label override (default: "Post caption") */
  label?: string;
  /**
   * When provided, the caption renders as an editable textarea. Parent owns
   * persistence (typically a debounced PATCH). Editing always operates on
   * `caption` (per-output) — never the fallback — so the first edit promotes
   * the kit fallback into a per-output value automatically.
   */
  onChange?: (next: string) => void;
  /** Truthy "saving…" indicator next to the label (parent-controlled). */
  saving?: boolean;
}

export function PostCaptionBlock({ caption, fallback, label = 'Post caption', onChange, saving }: PostCaptionBlockProps) {
  const [copied, setCopied] = useState(false);
  // Local mirror so typing feels instant — we don't wait for the debounced
  // PATCH round-trip before showing the user their character. Sync to props
  // when the underlying value changes (e.g., editing a different clip).
  const editable = !!onChange;
  const initialValue = caption?.trim() || (editable ? '' : fallback?.trim() || '');
  const [draft, setDraft] = useState(initialValue);
  const lastExternalRef = useRef(initialValue);
  useEffect(() => {
    const external = caption?.trim() || (editable ? '' : fallback?.trim() || '');
    if (external !== lastExternalRef.current) {
      lastExternalRef.current = external;
      setDraft(external);
    }
  }, [caption, fallback, editable]);

  // Display text: in edit mode show the draft (mirrors live typing); otherwise
  // prefer per-output caption then kit fallback.
  const text = editable ? draft : (caption?.trim() || fallback?.trim() || '');
  const isFallback = !editable && !caption?.trim() && !!fallback?.trim();

  // Hide the block entirely in display mode when there's nothing to show.
  // In edit mode, always render — the user needs the textarea to ADD a caption.
  if (!text && !editable) return null;

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
          {editable && (
            <span className="text-[11px] text-muted-foreground/70 font-normal ml-1.5">
              (click to edit)
            </span>
          )}
          {saving && (
            <span className="text-[11px] text-muted-foreground/80 font-normal ml-1.5 animate-pulse">
              saving…
            </span>
          )}
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!text}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy caption'}
          </button>
          <button
            type="button"
            onClick={handleOpenInstagram}
            disabled={!text}
            title="Copies the caption and opens Instagram in a new tab"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-gradient-to-r from-purple-600 via-red-500 to-orange-400 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span aria-hidden>📸</span>
            Open Instagram
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
      {editable ? (
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange!(e.target.value);
          }}
          rows={5}
          placeholder={fallback?.trim() ? `Using kit default: "${fallback.trim().slice(0, 80)}${fallback.trim().length > 80 ? '…' : ''}". Type to override.` : 'Write the caption that should accompany this post.'}
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap leading-relaxed resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary-interactive/40 focus:border-primary-interactive transition-colors"
        />
      ) : (
        // No height cap — parent modal column handles overflow scroll.
        // Caps that silently clip text were confusing users.
        <div className="bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {text}
        </div>
      )}
    </div>
  );
}

export default PostCaptionBlock;
