'use client';

/**
 * PostCaptionBlock
 *
 * Displays a contextual post caption for a visual output (clip, carousel,
 * reel). One quiet action: a copy icon. Posting/scheduling lives EXCLUSIVELY
 * in VisualPostActions below — this block used to carry its own
 * "Open Instagram" button, which read as the app's posting mechanism and
 * pulled eyes away from the real auto-post controls (founder call,
 * 2026-07-05: lean on the Outstand buttons, one home for publishing).
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
import { Copy, Check, Loader2 } from 'lucide-react';

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
  // Pre-fill the kit-default caption as the editable value (not just a gray
  // placeholder) so the user can actually SEE, edit, and copy it. The first
  // keystroke promotes it to a per-output caption via onChange — until then
  // nothing is persisted, so showing the default here is display-only.
  const initialValue = caption?.trim() || fallback?.trim() || '';
  const [draft, setDraft] = useState(initialValue);
  const lastExternalRef = useRef(initialValue);
  useEffect(() => {
    const external = caption?.trim() || fallback?.trim() || '';
    if (external !== lastExternalRef.current) {
      lastExternalRef.current = external;
      setDraft(external);
    }
  }, [caption, fallback, editable]);

  // Display text: in edit mode show the draft (mirrors live typing); otherwise
  // prefer per-output caption then kit fallback.
  const text = editable ? draft : (caption?.trim() || fallback?.trim() || '');
  const isFallback = !caption?.trim() && !!fallback?.trim();

  // Brief "Saved" confirmation after a save completes. Watching `saving`
  // transition from true → false lights this up for 1.5s, which gives the
  // user a quiet acknowledgment that their typing actually persisted —
  // a "saving…" indicator that just disappears can read as a glitch.
  const [justSaved, setJustSaved] = useState(false);
  const wasSavingRef = useRef(!!saving);
  useEffect(() => {
    if (wasSavingRef.current && !saving) {
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 1500);
      return () => clearTimeout(t);
    }
    wasSavingRef.current = !!saving;
  }, [saving]);

  // Hide the block entirely in display mode when there's nothing to show.
  // In edit mode, always render — the user needs the textarea to ADD a caption.
  if (!text && !editable) return null;

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
              {editable ? '(from kit default — edit to customize)' : '(from kit default)'}
            </span>
          )}
          {editable && !isFallback && !saving && !justSaved && (
            <span className="text-[11px] text-muted-foreground/70 font-normal ml-1.5">
              (auto-saves while you type)
            </span>
          )}
          {saving && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 font-normal ml-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving…
            </span>
          )}
          {justSaved && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-normal ml-1.5 transition-opacity">
              <Check className="w-3 h-3" />
              Saved
            </span>
          )}
        </label>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!text}
          title="Copy caption"
          aria-label="Copy caption"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground text-xs hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : ''}
        </button>
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
