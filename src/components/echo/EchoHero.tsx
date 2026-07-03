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
import { CreateHeroHeader } from '@/components/create/CreateHeroHeader';
import { ProposalChips } from '@/components/create/ProposalChips';
import { StarterChips } from '@/components/create/StarterChips';
import { DraftsThreadMessage } from '@/components/create/DraftsThreadMessage';
import { QuotaLine } from '@/components/create/QuotaLine';
import { RecentKitsStrip } from '@/components/create/RecentKitsStrip';
import { VoiceStrengthStrip } from '@/components/create/VoiceStrengthStrip';
import { useAuth } from '@/hooks/useAuth';
import { useEcho } from './useEcho';
import { useEchoMic } from './useEchoMic';
import { EchoExchange } from './EchoExchange';
import { AttachmentCard } from './AttachmentCard';
import { useAdvisor } from './useAdvisor';
import { EchoHeroTour } from '@/components/tour/tours/echo-hero';
import type { Proposal } from '@/types/advisor';

/** Format elapsed seconds as M:SS */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface EchoHeroProps {
  quota?: { remaining: number; limit: number } | null;
  // The hidden GenerationForm resting-state mount (kept alive off-screen so
  // its effects keep running) sets this false to skip the below-fold strips'
  // self-fetching mounts (RecentKitsStrip, VoiceStrengthStrip), which would
  // otherwise double-fire their network calls alongside the visible hero.
  belowFold?: boolean;
}

export function EchoHero({ quota, belowFold = true }: EchoHeroProps = {}) {
  const { navigate } = useAppNavigation();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ---- KB Advisor ----
  // Declared above useEcho so the ingest path can refetch the advisor when
  // Echo adds material to Your Voice — the refresh the retired KBUnifiedInput
  // pill used to trigger via onImportComplete.
  const { advisor, loading: advisorLoading, refetch: refetchAdvisor } = useAdvisor();
  const { user } = useAuth();
  // useAuth's User type carries `name` (not `full_name` — that field lives on
  // the extended UserProfile from /auth/profile/extended). See sidebar.tsx /
  // mobile-sidebar.tsx / app-header.tsx for the same convention.
  const firstName = user?.name?.trim().split(/\s+/)[0] || undefined;
  const advisorState = advisor?.state ?? null;

  const {
    state,
    open,
    setInputText,
    setAttachment,
    submit,
    selectIntent,
    confirm,
    reset,
    chooseOwnership,
    chooseDestination,
    chooseFileDestination,
    clipSavedVideo,
    confirmAction,
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

  // Empty state has little content by design; vertically center it so the
  // whitespace reads as composition, not absence. Thin/rich stay top-anchored
  // (they have below-the-fold sections).
  const isEmptyState = !advisorLoading && (!advisor || advisor.state === 'empty');

  return (
    <div
      ref={heroRef}
      className={[
        'flex flex-col items-center w-full',
        isEmptyState ? 'justify-center min-h-[calc(100vh-14rem)]' : '',
      ].join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Static hero header: orient a cold user (what it does, the payoff, the
          best first move). Shown ONLY before the user has shared anything. Once
          Echo has content, CreateHeroHeader below renders a personalized
          headline + nudge line, which makes this generic header redundant —
          so hide it in the thin/rich states. */}
      {/* Gate on !advisorLoading: `advisor` is null both before the fetch
          resolves AND when the KB is genuinely empty. Without the loading
          guard, a content account paints the empty-state explainer for the
          fetch window, then collapses it once the rich advisor arrives — a
          flash of the big animation on every Create-page load. Wait for
          certainty before deciding the state is empty. */}
      {isEmptyState && (
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
          {/* SketchExplainer animation removed 2026-07-03 (founder call): it
              dominated the empty-state viewport and pushed the composer, the
              single ingestion front door, below the fold. Fold discipline
              applies to the empty state too. */}
        </>
      )}

      <CreateHeroHeader
        state={advisorState}
        nudgeHeadline={advisor?.nudge.headline}
        firstName={firstName}
      />
      <div className="w-full max-w-2xl space-y-4 mb-6">
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
          handlers={{ setInputText, submit, selectIntent, confirm, reset, chooseOwnership, chooseDestination, chooseFileDestination, clipSavedVideo, confirmAction }}
          placeholder="Talk, type, or drop a file. A video, a link, or just a topic."
          onTextareaMount={(el) => {
            textareaRef.current = el;
          }}
        />

        {/* Bottom toolbar: waveform motif + attach + mic */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[var(--border)]">
          {/* Static waveform motif (Echo identity) */}
          <Waveform bars={5} height={14} animated={false} />

          <div className="flex-1" />

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

      </div>

      {quota && <QuotaLine remaining={quota.remaining} limit={quota.limit} />}

      {(advisorState === 'thin' || advisorState === 'rich') && advisor && (
        <ProposalChips proposals={advisor.proposals} onSelect={handleProposalSelect} />
      )}
      {isEmptyState && (
        <>
          <StarterChips
            onTalk={() => { if (micState === 'idle' || micState === 'error') void startMic(); }}
            onAttach={() => fileInputRef.current?.click()}
            onType={focusComposer}
          />
          {/* One-line do->get orientation. Carries the removed animation's
              message at zero vertical cost. */}
          <p
            className="mt-4 text-center text-xs leading-snug max-w-md"
            style={{ color: 'var(--muted-foreground)' }}
          >
            A video, a link, or a topic in. Clips, posts, and carousels out, in your voice.
          </p>
        </>
      )}

      {belowFold && (advisorState === 'thin' || advisorState === 'rich') && <RecentKitsStrip />}

      {/* Voice-profile strip — tier, coverage subline, Teach Echo more CTA */}
      {belowFold && (advisorState === 'thin' || advisorState === 'rich') && (
        <VoiceStrengthStrip coverage={advisor?.coverage ?? null} onTeachMore={focusComposer} />
      )}

      {/* Hero tour + replay pill */}
      <EchoHeroTour />

      {/* Inline exchange region — not a modal */}
      {/* EchoExchange is rendered inside the surface above; this outer
          region can expand naturally with the content. No role="dialog". */}
    </div>
  );
}
