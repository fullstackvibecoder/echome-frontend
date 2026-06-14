'use client';

/**
 * EchoHero.tsx
 * Hero-mode Echo input for the Home (Create) page.
 * Reuses the same state machine (useEcho + useEchoMic + EchoExchange) as
 * the docked pill — same behaviors, different chrome. The exchange region
 * renders inline below the input; this is not a modal.
 *
 * Cyan is reserved for: focus glow, active intent chip, waveform bars.
 * All other surfaces use app-canvas tokens only.
 */

import {
  useRef,
  useEffect,
  useCallback,
  useState,
} from 'react';
import { Paperclip, X, Mic, Square } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Waveform } from '@/components/ui/waveform';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { AdvisorThread } from '@/components/create/AdvisorThread';
import { DraftsThreadMessage } from '@/components/create/DraftsThreadMessage';
import { useEcho } from './useEcho';
import { useEchoMic } from './useEchoMic';
import { EchoExchange } from './EchoExchange';
import { useAdvisor } from './useAdvisor';
import type { LadderActionId } from '@/components/create/ValueLadder';
import type { NudgeAction, Proposal } from '@/types/advisor';

/** Format bytes to human-readable string ("4.2 MB") */
function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Format elapsed seconds as M:SS */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function EchoHero() {
  const { navigate } = useAppNavigation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    state,
    open,
    setInputText,
    setAttachment,
    submit,
    selectIntent,
    confirm,
    reset,
  } = useEcho(navigate);

  const heroRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);

  // Ensure the state machine is in the 'open' phase on mount so
  // the textarea is always visible (the hero is always expanded).
  // Also consume an ?echoAsk= prefill (e.g. the Mind-Reader chip): drop the
  // text into the input WITHOUT auto-submitting, so the user reviews and sends.
  useEffect(() => {
    open();
    const ask = searchParams.get('echoAsk');
    if (ask) {
      setInputText(ask);
      const next = new URLSearchParams(searchParams.toString());
      next.delete('echoAsk');
      const qs = next.toString();
      router.replace(`/app${qs ? `?${qs}` : ''}`);
      setTimeout(() => textareaRef.current?.focus(), 60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Mic ----
  const handleTranscript = useCallback(
    (text: string) => {
      setInputText(text);
      // Ensure open phase is active after transcript arrives
      open();
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 60);
    },
    [setInputText, open],
  );

  const { micState, elapsed, micError, start: startMic, stop: stopMic } = useEchoMic(handleTranscript);

  // ---- KB Advisor ----
  const { advisor } = useAdvisor();

  const focusComposer = useCallback(() => {
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const handleLadderAction = useCallback((id: LadderActionId) => {
    switch (id) {
      case 'voice':
        if (micState === 'idle' || micState === 'error') void startMic();
        break;
      case 'video':
      case 'emails':
      case 'published':
        fileInputRef.current?.click();
        break;
      case 'paste':
      case 'topic':
        focusComposer();
        break;
    }
  }, [micState, startMic, focusComposer]);

  const handleNudgeAction = useCallback((action: NudgeAction) => {
    if (action.type === 'voice') {
      if (micState === 'idle' || micState === 'error') void startMic();
    } else if (action.type === 'ingest') {
      fileInputRef.current?.click();
    } else if (action.type === 'create') {
      const prompt = action.payload?.prompt;
      if (typeof prompt === 'string' && prompt.length > 0) {
        setInputText(prompt);
      }
      focusComposer();
    }
  }, [micState, startMic, setInputText, focusComposer]);

  const handleProposalSelect = useCallback((proposal: Proposal) => {
    setInputText(proposal.title);
    focusComposer();
  }, [setInputText, focusComposer]);

  // ---- Drag-and-drop ----
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (heroRef.current && !heroRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      setAttachment(file);
    },
    [setAttachment],
  );

  // ---- File input (paperclip) ----
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setAttachment(file);
      e.target.value = '';
    },
    [setAttachment],
  );

  const { attachment, attachmentError } = state;

  return (
    <div
      ref={heroRef}
      className="flex flex-col items-center w-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Display headline */}
      <h1
        className="mb-2 text-center font-semibold leading-tight"
        style={{
          fontSize: 'clamp(1.5rem, 1.25rem + 1.25vw, 1.875rem)',
          color: 'var(--foreground)',
        }}
      >
        What are we making?
      </h1>

      {/* Capability subhead: this is a command centre, not just a chat box */}
      <p
        className="mb-6 text-center text-sm leading-snug max-w-xl"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Drop in a video to clip it, paste a YouTube link, type a topic, or
        just talk. Echo turns it into content in your voice.
      </p>

      {/* Advisor + drafts thread -- renders above composer in the chat thread */}
      <div className="w-full max-w-2xl space-y-4 mb-6">
        {advisor && (
          <AdvisorThread
            advisor={advisor}
            onLadderAction={handleLadderAction}
            onNudgeAction={handleNudgeAction}
            onProposalSelect={handleProposalSelect}
          />
        )}
        <DraftsThreadMessage />
      </div>

      {/* Hero input surface */}
      <div
        className={[
          'w-full max-w-2xl rounded-2xl border',
          'bg-[var(--surface-container-low)]',
          'px-5 py-4',
          'transition-shadow',
        ].join(' ')}
        style={{
          borderColor: isDragOver
            ? 'rgba(0,212,255,0.45)'
            : 'var(--border)',
          boxShadow: isDragOver
            ? 'var(--shadow-glow-cyan)'
            : 'var(--shadow-soft)',
          transition: `box-shadow var(--dur-base, 180ms) var(--ease-standard, cubic-bezier(0.2,0,0,1)),
                       border-color var(--dur-base, 180ms) var(--ease-standard, cubic-bezier(0.2,0,0,1))`,
        }}
      >
        {/* Attachment chip */}
        {attachment && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <span
              className="text-machine truncate flex-1"
              style={{ fontSize: '0.625rem' }}
            >
              {attachment.name}
            </span>
            <span
              className="text-machine shrink-0"
              style={{ color: 'var(--muted-foreground)', fontSize: '0.625rem' }}
            >
              {humanSize(attachment.size)}
            </span>
            <button
              type="button"
              aria-label={`Remove ${attachment.name}`}
              onClick={() => setAttachment(null)}
              className="shrink-0 text-[var(--muted-foreground)] hover:text-foreground transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Attachment inline error */}
        {attachmentError && (
          <p className="text-xs text-destructive leading-snug mb-3 px-1" role="alert">
            {attachmentError}
          </p>
        )}

        {/* Mic error */}
        {micError && (
          <p className="text-xs text-destructive leading-snug mb-3 px-1" role="alert">
            {micError}
          </p>
        )}

        {/* Recording state — Waveform is the voice moment */}
        {micState === 'recording' && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <Waveform bars={5} height={18} animated />
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
              <Square size={13} />
            </button>
          </div>
        )}

        {/* Transcribing indicator */}
        {micState === 'transcribing' && (
          <div className="flex items-center gap-2 mb-3 px-1">
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

        {/* Exchange: textarea, intent chips, receipts, confirm */}
        <EchoExchange
          state={state}
          handlers={{ setInputText, submit, selectIntent, confirm, reset }}
          onTextareaMount={(el) => {
            textareaRef.current = el;
          }}
        />

        {/* Bottom toolbar: waveform motif + attach + mic */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[var(--border)]">
          {/* Static waveform motif (Echo identity) */}
          <Waveform bars={5} height={14} animated={false} />

          <span
            className="flex-1 text-machine"
            style={{ color: 'var(--muted-foreground)', fontSize: '0.5625rem' }}
          >
            VIDEO · AUDIO · DOCS · LINKS · TOPIC. TYPE, DROP, OR TALK
          </span>

          {/* Paperclip attach */}
          <label
            htmlFor="echo-hero-file-input"
            className="shrink-0 cursor-pointer text-[var(--muted-foreground)] hover:text-foreground transition-colors p-1"
            aria-label="Attach a video, PDF, or document"
            title="Attach a video, PDF, or document"
          >
            <Paperclip size={16} />
          </label>
          <input
            ref={fileInputRef}
            id="echo-hero-file-input"
            type="file"
            accept="video/*,audio/*,.txt,.md,.pdf,.docx,.doc,.mbox"
            className="sr-only"
            onChange={handleFileInputChange}
            tabIndex={-1}
          />

          {/* Mic button */}
          <button
            type="button"
            aria-label="Record your voice"
            title="Record your voice"
            onClick={() => {
              if (micState === 'recording') {
                stopMic();
              } else if (micState === 'idle' || micState === 'error') {
                void startMic();
              }
            }}
            disabled={micState === 'transcribing'}
            className={[
              'shrink-0 transition-colors p-1',
              micState === 'recording'
                ? 'text-[rgba(0,212,255,0.9)]'
                : 'text-[var(--muted-foreground)] hover:text-foreground',
              micState === 'transcribing' ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {micState === 'recording' ? <Square size={16} /> : <Mic size={16} />}
          </button>
        </div>

        {/* Source helper line */}
        <p className="mt-2 text-xs text-muted-foreground leading-snug">
          You can paste a link, upload a file, or record your voice. I work with YouTube, Zoom, Loom, and Vimeo links.
        </p>
      </div>

      {/* Inline exchange region — not a modal */}
      {/* EchoExchange is rendered inside the surface above; this outer
          region can expand naturally with the content. No role="dialog". */}
    </div>
  );
}
