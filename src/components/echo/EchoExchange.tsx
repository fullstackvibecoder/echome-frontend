'use client';

/**
 * EchoExchange.tsx
 * Expanded exchange panel that opens upward from the EchoPill.
 * Purely presentational: driven entirely by useEcho state + callbacks.
 */

import { useRef, useCallback } from 'react';
import type { EchoIntent } from '@/lib/echo-client';
import { INTENT_META, ALL_INTENTS } from './intent-meta';
import type { EchoState, UseEchoReturn } from './useEcho';

interface EchoExchangeProps {
  state: EchoState;
  handlers: Pick<UseEchoReturn, 'setInputText' | 'submit' | 'selectIntent' | 'confirm' | 'reset'>;
  /** Called with the textarea element once it mounts, so EchoPill can manage focus */
  onTextareaMount?: (el: HTMLTextAreaElement | null) => void;
}

export function EchoExchange({ state, handlers, onTextareaMount }: EchoExchangeProps) {
  const { phase, inputText, classification, selectedIntent, answer, receipts, error } = state;
  const { setInputText, submit, selectIntent, confirm, reset } = handlers;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea (up to 4 rows)
  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    const lineHeight = 20;
    const maxHeight = lineHeight * 4 + 24; // 4 rows + padding
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    autoResize(e.target);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (phase === 'open' && (inputText.trim() || state.attachment)) {
        submit();
      }
    }
  };

  const isInputPhase = phase === 'open' || phase === 'classifying';
  const isConfirming = phase === 'confirming' || phase === 'executing';
  const isAnswered = phase === 'answered';
  const isDone = phase === 'done';

  const resolvedIntent: EchoIntent | null = selectedIntent ?? classification?.intent ?? null;

  // What will actually be handed off when the user confirms — shown under the
  // chips so confirming feels like an action, not a dead end. Falls back to
  // the raw input when the classifier returned no extracted arg (or when the
  // user corrected the intent, since args belong to the detected one).
  const argKeyByIntent: Record<EchoIntent, string> = {
    create: 'prompt',
    ingest: 'note',
    question: 'query',
    command: 'detail',
  };
  const handoffPreview: string | null = resolvedIntent
    ? classification?.args?.[argKeyByIntent[resolvedIntent]] || inputText.trim() || null
    : null;

  return (
    <div
      className="flex flex-col gap-3"
      style={{ minWidth: 0 }}
    >
      {/* Receipts list (last 3, newest first) */}
      {receipts.length > 0 && (
        <div className="flex flex-col gap-1 px-1" aria-live="polite" aria-label="Recent actions">
          {receipts.map((r) => (
            <span key={r.id} className="text-machine">
              {r.text}
            </span>
          ))}
        </div>
      )}

      {/* Answer block (question intent) */}
      {isAnswered && answer && (
        <div className="rounded-lg bg-[var(--surface-container-high)] border border-[var(--border)] px-3 py-2">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{answer}</p>
        </div>
      )}

      {/* Intent chip row (confirming / executing / answered phase) */}
      {(isConfirming || isAnswered) && classification && (
        <div className="flex flex-col gap-2">
          <span className="text-machine" style={{ color: 'var(--muted-foreground)' }}>
            DETECTED INTENT
          </span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Detected intent. Select to correct.">
            {ALL_INTENTS.map((intent) => {
              const meta = INTENT_META[intent];
              const isActive = resolvedIntent === intent;
              return (
                <button
                  key={intent}
                  type="button"
                  onClick={() => {
                    selectIntent(intent);
                  }}
                  aria-pressed={isActive}
                  className={[
                    'text-machine rounded px-2.5 py-1 transition-colors',
                    'border',
                    isActive
                      ? 'border-[rgba(0,212,255,0.6)] bg-[rgba(0,212,255,0.08)] text-[rgba(0,212,255,0.9)]'
                      : 'border-[var(--border)] bg-[var(--surface-container)] text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[var(--surface-container-high)]',
                  ].join(' ')}
                  style={{ fontSize: '0.625rem', letterSpacing: '0.12em' }}
                  title={meta.description}
                >
                  {meta.chipLabel}
                </button>
              );
            })}
          </div>

          {/* Handoff preview: what confirming will actually do */}
          {!isAnswered && handoffPreview && (
            <p
              className="text-xs text-[var(--muted-foreground)] border-l-2 border-[var(--border)] pl-2 leading-snug line-clamp-2"
              aria-label="What Echo will do"
            >
              {handoffPreview}
            </p>
          )}

          {/* Confirm button (only in confirming/executing phases) */}
          {!isAnswered && (
            <button
              type="button"
              onClick={confirm}
              disabled={phase === 'executing'}
              className={[
                'self-start px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                'bg-[var(--surface-container-high)] border border-[var(--border)]',
                'text-foreground hover:bg-[var(--surface-container-highest,var(--surface-container-high))]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              {phase === 'executing' ? 'Working...' : resolvedIntent === 'create' ? 'Open Create' : resolvedIntent === 'ingest' ? 'Add to Voice' : resolvedIntent === 'command' ? 'Navigate' : 'Ask Voice'}
            </button>
          )}
        </div>
      )}

      {/* Done state: nudge to ask another */}
      {isDone && (
        <div className="flex items-center justify-between">
          <span className="text-machine">DONE</span>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-[var(--muted-foreground)] hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Ask another
          </button>
        </div>
      )}

      {/* Inline error */}
      {error && (
        <p className="text-xs text-destructive leading-snug" role="alert">
          {error}
        </p>
      )}

      {/* Textarea input */}
      {isInputPhase && (
        <div className="relative">
          <textarea
            ref={(el) => {
              (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
              onTextareaMount?.(el);
            }}
            value={inputText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Tell Echo anything..."
            rows={1}
            disabled={phase === 'classifying'}
            aria-label="Echo input"
            className={[
              'w-full resize-none rounded-lg border border-[var(--border)]',
              'bg-[var(--surface-container-lowest,var(--card))]',
              'px-3 py-2 text-sm text-foreground',
              'placeholder:text-[var(--muted-foreground)]',
              'focus:outline-none focus:ring-2 focus:ring-[rgba(0,212,255,0.4)]',
              'disabled:opacity-60',
              'transition-colors',
            ].join(' ')}
            style={{
              minHeight: '2.5rem',
              maxHeight: `${20 * 4 + 24}px`,
              overflowY: 'auto',
              lineHeight: '20px',
            }}
          />
          {phase === 'classifying' && (
            <div className="absolute right-2.5 bottom-2.5">
              <span className="text-machine animate-pulse">THINKING</span>
            </div>
          )}
        </div>
      )}

      {/* Hint: Shift+Enter for newline, Enter to submit */}
      {phase === 'open' && (inputText.trim() || state.attachment) && (
        <p className="text-machine" style={{ fontSize: '0.5625rem' }}>
          ENTER TO SUBMIT, SHIFT+ENTER FOR NEWLINE
        </p>
      )}
    </div>
  );
}
