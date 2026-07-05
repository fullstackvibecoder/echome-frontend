'use client';

/**
 * EchoPill.tsx
 * Docked copilot pill. Fixed bottom-center of the content area.
 * Cmd+K / Ctrl+K summon; Escape + outside-click collapse.
 * role="dialog" when expanded; focus trapped while open.
 * Cyan glow only on focus / expanded state.
 * v2: drop target + paperclip attach + removable attachment chip.
 * v3: mic input - tap-to-talk, transcribe, classify.
 */

import {
  useRef,
  useEffect,
  useCallback,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { Paperclip, Mic, Square } from 'lucide-react';
import { Waveform } from '@/components/ui/waveform';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useEcho } from './useEcho';
import { useEchoMic } from './useEchoMic';
import { EchoExchange } from './EchoExchange';
import { AttachmentCard } from './AttachmentCard';
import { getPillSuggestions } from './pill-suggestions';

/** Format elapsed seconds as M:SS */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function EchoPill() {
  const { navigate } = useAppNavigation();
  const { state, open, close, setInputText, setAttachment, submit, selectIntent, confirm, reset, chooseOwnership, chooseDestination, chooseFileDestination, clipSavedVideo, confirmAction } = useEcho(navigate);
  const pathname = usePathname();

  const pillRef = useRef<HTMLDivElement>(null);
  const exchangeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pillButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);

  // ---- Mic ----
  const handleTranscript = useCallback(
    (text: string) => {
      setInputText(text);
      // Ensure the pill is open so the textarea is visible
      if (state.phase === 'idle') open();
      // Focus the textarea after React flushes
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 60);
    },
    [setInputText, state.phase, open],
  );

  const { micState, elapsed, micError, start: startMic, stop: stopMic } = useEchoMic(handleTranscript);

  const isOpen = state.phase !== 'idle';

  // Focus textarea when expanded
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow panel to mount and onTextareaMount to fire
      const id = setTimeout(() => {
        textareaRef.current?.focus();
      }, 60);
      return () => clearTimeout(id);
    } else if (!isOpen && pillButtonRef.current) {
      pillButtonRef.current.focus();
    }
  }, [isOpen]);

  // Cmd+K / Ctrl+K global listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        if (state.phase === 'confirming') {
          // Back to input without executing; keep receipts intact
          reset();
        } else if (state.phase !== 'executing') {
          // executing is non-abortable; all other open phases collapse normally
          close();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, open, close, reset, state.phase]);

  // Outside-click collapse (not during executing phase or while mic is active)
  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (!isOpen) return;
      if (state.phase === 'executing') return;
      if (micState === 'recording' || micState === 'transcribing') return;
      const target = e.target as Node;
      if (
        pillRef.current && !pillRef.current.contains(target)
      ) {
        close();
      }
    },
    [isOpen, state.phase, micState, close],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleOutsideClick]);

  // Focus trap: Tab cycles within the pill container
  const handleKeyDownTrap = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isOpen || e.key !== 'Tab') return;
      const container = pillRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, textarea, input, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [isOpen],
  );

  // ---- Drag-and-drop handlers ----
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the pill container entirely
    if (pillRef.current && !pillRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      // Auto-expand on drop
      if (!isOpen) open();
      setAttachment(file);
    },
    [isOpen, open, setAttachment],
  );

  // ---- File input (paperclip button) ----
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!isOpen) open();
      setAttachment(file);
      // Reset so re-selecting same file fires again
      e.target.value = '';
    },
    [isOpen, open, setAttachment],
  );

  // Suppress the docked pill on Home — the hero input owns that page.
  if (pathname === '/app') return null;

  const { attachment, attachmentError } = state;

  const glowStyle = isDragOver
    ? { boxShadow: 'var(--shadow-glow-cyan)' }
    : undefined;

  return (
    <div
      ref={pillRef}
      className="fixed bottom-6 left-1/2 z-40"
      style={{ transform: 'translateX(-50%)', width: 'min(calc(100% - 2rem), 36rem)' }}
      onKeyDown={handleKeyDownTrap}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Expanded exchange panel — opens upward */}
      {isOpen && (
        <div
          ref={exchangeRef}
          role="dialog"
          aria-label="Echo"
          aria-modal="true"
          className={[
            'mb-2 rounded-2xl border border-[var(--border)]',
            'bg-[var(--surface-container-low)]',
            'px-4 py-3',
            'overflow-y-auto',
          ].join(' ')}
          style={{
            maxHeight: '50vh',
            transition: `opacity var(--dur-base, 180ms) var(--ease-standard, cubic-bezier(0.2,0,0,1)),
                         transform var(--dur-base, 180ms) var(--ease-standard, cubic-bezier(0.2,0,0,1))`,
            boxShadow: isDragOver ? 'var(--shadow-glow-cyan)' : 'var(--shadow-glow-cyan)',
          }}
        >
          {/* Attachment ready card — shown in exchange panel */}
          {attachment && (
            <AttachmentCard file={attachment} onRemove={() => setAttachment(null)} />
          )}

          {/* Attachment inline error */}
          {attachmentError && (
            <p className="text-xs text-destructive leading-snug mb-2 px-1" role="alert">
              {attachmentError}
            </p>
          )}

          {/* Mic error */}
          {micError && (
            <p className="text-xs text-destructive leading-snug mb-2 px-1" role="alert">
              {micError}
            </p>
          )}

          {/* Recording state UI */}
          {micState === 'recording' && (
            <div className="flex items-center gap-3 mb-2 px-1">
              <Waveform bars={5} height={14} animated />
              <span
                className="text-machine tabular-nums"
                style={{ color: 'var(--muted-foreground)', fontSize: '0.625rem' }}
              >
                {formatElapsed(elapsed)}
              </span>
              <button
                type="button"
                aria-label="Stop recording"
                onClick={stopMic}
                className="shrink-0 text-[var(--muted-foreground)] hover:text-foreground transition-colors"
              >
                <Square size={11} />
              </button>
            </div>
          )}

          {/* Transcribing indicator */}
          {micState === 'transcribing' && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-machine animate-pulse" style={{ fontSize: '0.625rem' }}>
                TRANSCRIBING
              </span>
            </div>
          )}

          {/* a11y: recording state announced to screen readers */}
          <div aria-live="polite" className="sr-only">
            {micState === 'recording'
              ? `Recording. ${formatElapsed(elapsed)} elapsed.`
              : micState === 'transcribing'
              ? 'Transcribing audio.'
              : ''}
          </div>

          {/* Page-aware suggestion chips. Prefill only, never auto-submit:
              the user always reviews before sending. Shown only while the
              exchange is idle/open so receipts and forks keep the space. */}
          {state.phase === 'open' && (
            <div className="flex flex-wrap gap-1.5 mb-2 px-1">
              {getPillSuggestions(pathname ?? '').map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setInputText(chip);
                    setTimeout(() => textareaRef.current?.focus(), 30);
                  }}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-container)] px-2.5 py-1 text-xs text-[var(--muted-foreground)] hover:text-foreground hover:border-[rgba(0,212,255,0.4)] transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <EchoExchange
            state={state}
            handlers={{ setInputText, submit, selectIntent, confirm, reset, chooseOwnership, chooseDestination, chooseFileDestination, clipSavedVideo, confirmAction }}
            onTextareaMount={(el) => { textareaRef.current = el; }}
          />

          {/* Do-to-get affordance line: reveal the pill's non-obvious powers. */}
          <p className="mt-2 px-1 text-[11px] leading-snug text-[var(--muted-foreground)]/70">
            Drop a video or doc to teach Echo. Paste a link to create content. Tap the mic to talk.
          </p>
        </div>
      )}

      {/* Docked pill */}
      <div
        className={[
          'w-full flex items-center gap-2 px-4 py-2.5',
          'rounded-full border border-[var(--border)]',
          'bg-[var(--surface-container-low)]',
          'transition-shadow',
        ].join(' ')}
        style={{
          boxShadow: isDragOver
            ? 'var(--shadow-glow-cyan)'
            : isOpen
            ? 'var(--shadow-glow-cyan)'
            : undefined,
          transition: `box-shadow var(--dur-base, 180ms) var(--ease-standard, cubic-bezier(0.2,0,0,1))`,
          ...(glowStyle && !isOpen ? glowStyle : {}),
        }}
      >
        {/* Pill click target (expand/collapse) */}
        <button
          ref={pillButtonRef}
          type="button"
          aria-label="Open Echo"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={() => (isOpen ? close() : open())}
          className="flex items-center gap-3 flex-1 min-w-0 focus:outline-none"
        >
          {/* Waveform motif (static in pill; Echo listening) */}
          <Waveform bars={5} height={14} animated={false} />

          {/* Placeholder text or attachment chip summary */}
          <span
            className="flex-1 text-left text-sm text-[var(--muted-foreground)] truncate"
            aria-hidden="true"
          >
            {attachment && !isOpen ? attachment.name : 'Tell Echo anything...'}
          </span>
        </button>

        {/* Paperclip attach button */}
        <label
          htmlFor="echo-file-input"
          className="shrink-0 cursor-pointer text-[var(--muted-foreground)] hover:text-foreground transition-colors p-0.5"
          aria-label="Attach a file"
          title="Attach a file (video, audio, document, text, or .mbox email archive)"
        >
          <Paperclip size={14} />
        </label>
        <input
          ref={fileInputRef}
          id="echo-file-input"
          type="file"
          accept="video/*,audio/*,.txt,.md,.pdf,.docx,.doc,.mbox"
          className="sr-only"
          onChange={handleFileInputChange}
          tabIndex={-1}
        />

        {/* Mic button */}
        <button
          type="button"
          aria-label="Talk to Echo"
          title="Talk to Echo"
          onClick={() => {
            if (micState === 'recording') {
              stopMic();
            } else if (micState === 'idle' || micState === 'error') {
              if (!isOpen) open();
              void startMic();
            }
          }}
          disabled={micState === 'transcribing'}
          className={[
            'shrink-0 transition-colors p-0.5',
            micState === 'recording'
              ? 'text-[rgba(0,212,255,0.9)]'
              : 'text-[var(--muted-foreground)] hover:text-foreground',
            micState === 'transcribing' ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
        >
          {micState === 'recording' ? <Square size={14} /> : <Mic size={14} />}
        </button>

        {/* Keyboard hint chip */}
        <span
          className="text-machine shrink-0 rounded px-1.5 py-0.5 border border-[var(--border)] bg-[var(--surface-container)]"
          aria-hidden="true"
        >
          &#8984;K
        </span>
      </div>
    </div>
  );
}
