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
import { Paperclip, Mic, Square } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Waveform } from '@/components/ui/waveform';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { AdvisorThread } from '@/components/create/AdvisorThread';
import { DraftsThreadMessage } from '@/components/create/DraftsThreadMessage';
import { useEcho } from './useEcho';
import { useEchoMic } from './useEchoMic';
import { EchoExchange } from './EchoExchange';
import { AttachmentCard } from './AttachmentCard';
import { useAdvisor } from './useAdvisor';
import { VoiceLearningChip } from './VoiceLearningChip';
import { EchoHeroTour } from '@/components/tour/tours/echo-hero';
import { SketchExplainer } from '@/components/sketch/SketchExplainer';
import type { NudgeAction, Proposal } from '@/types/advisor';

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

  // ---- KB Advisor ----
  // Declared above useEcho so the ingest path can refetch the advisor when
  // Echo adds material to Your Voice — the refresh the retired KBUnifiedInput
  // pill used to trigger via onImportComplete.
  const { advisor, refetch: refetchAdvisor } = useAdvisor();

  const {
    state,
    open,
    setInputText,
    setAttachment,
    submit,
    selectIntent,
    confirm,
    reset,
  } = useEcho(navigate, { onIngestComplete: refetchAdvisor });

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

  const focusComposer = useCallback(() => {
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

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
      {/* Static hero header: orient a cold user (what it does, the payoff, the
          best first move). Shown ONLY before the user has shared anything. Once
          Echo has content it renders a personalized nudge ("Echo can build from
          what you shared") in AdvisorThread below, which makes this generic
          header redundant — so hide it in the thin/rich states. */}
      {(!advisor || advisor.state === 'empty') && (
        <>
          <h1
            className="mb-2 text-center font-semibold leading-tight"
            style={{
              fontSize: 'clamp(1.5rem, 1.25rem + 1.25vw, 1.875rem)',
              color: 'var(--foreground)',
            }}
          >
            Teach Echo to write in your voice.
          </h1>
          <p
            className="mb-6 text-center text-sm leading-snug max-w-xl"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Share how you already communicate. Echo learns your voice from it. Then it writes posts that sound like you.
          </p>
          {/* Ambient do->get explainer: teaches one-video -> clips/posts/
              carousels while the KB is empty. Self-drawing, silent, loops in
              view, freezes on reduced-motion. Abstract (not a screenshot of
              this page) so it never recurses against the real composer below.
              Collapses with this header once Echo has content. */}
          <div className="w-full max-w-xl mb-6">
            <SketchExplainer
              scene="what-is-echome"
              accent="var(--muted-foreground)"
              caption="One video in. Clips, posts, and carousels out, in your voice."
            />
          </div>
        </>
      )}

      {/* Advisor + drafts thread -- renders above composer in the chat thread */}
      <div className="w-full max-w-2xl space-y-4 mb-6">
        {advisor && (
          <AdvisorThread
            advisor={advisor}
            onNudgeAction={handleNudgeAction}
            onProposalSelect={handleProposalSelect}
          />
        )}
        <DraftsThreadMessage />
      </div>

      {/* Hero input surface */}
      <div
        data-tour="echo-hero-input"
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
        {/* Attachment ready card */}
        {attachment && (
          <AttachmentCard file={attachment} onRemove={() => setAttachment(null)} />
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
            VIDEO · AUDIO · DOCS · LINKS · TOPIC. TALK, TYPE, OR DROP
          </span>

          {/* Paperclip attach */}
          <label
            htmlFor="echo-hero-file-input"
            data-tour="echo-hero-attach"
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
            data-tour="echo-hero-mic"
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

        {/* Source helper line -- voice-first; files accepted, but the guided path is to talk */}
        <p className="mt-2 text-xs text-muted-foreground leading-snug">
          Best way to start: tap the mic and talk for a minute. You can also paste a link, drop a file, or type a topic. I work with YouTube, Zoom, Loom, and Vimeo links.
        </p>
      </div>

      {/* Voice-profile status chip — links to /app/voice */}
      <VoiceLearningChip />

      {/* Hero tour + replay pill */}
      <EchoHeroTour />

      {/* Inline exchange region — not a modal */}
      {/* EchoExchange is rendered inside the surface above; this outer
          region can expand naturally with the content. No role="dialog". */}
    </div>
  );
}
