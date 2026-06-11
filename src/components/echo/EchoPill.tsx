'use client';

/**
 * EchoPill.tsx
 * Docked copilot pill. Fixed bottom-center of the content area.
 * Cmd+K / Ctrl+K summon; Escape + outside-click collapse.
 * role="dialog" when expanded; focus trapped while open.
 * Cyan glow only on focus / expanded state.
 */

import {
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { Waveform } from '@/components/ui/waveform';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useEcho } from './useEcho';
import { EchoExchange } from './EchoExchange';

export function EchoPill() {
  const { navigate } = useAppNavigation();
  const { state, open, close, setInputText, submit, selectIntent, confirm, reset } = useEcho(navigate);

  const pillRef = useRef<HTMLDivElement>(null);
  const exchangeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pillButtonRef = useRef<HTMLButtonElement>(null);

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
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, open, close]);

  // Outside-click collapse (not during executing phase)
  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (!isOpen) return;
      if (state.phase === 'executing') return;
      const target = e.target as Node;
      if (
        pillRef.current && !pillRef.current.contains(target)
      ) {
        close();
      }
    },
    [isOpen, state.phase, close],
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

  return (
    <div
      ref={pillRef}
      className="fixed bottom-6 left-1/2 z-40"
      style={{ transform: 'translateX(-50%)', width: 'min(calc(100% - 2rem), 36rem)' }}
      onKeyDown={handleKeyDownTrap}
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
            boxShadow: 'var(--shadow-glow-cyan)',
          }}
        >
          <EchoExchange
            state={state}
            handlers={{ setInputText, submit, selectIntent, confirm, reset }}
            onTextareaMount={(el) => { textareaRef.current = el; }}
          />
        </div>
      )}

      {/* Docked pill */}
      <button
        ref={pillButtonRef}
        type="button"
        aria-label="Open Echo"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => (isOpen ? close() : open())}
        className={[
          'w-full flex items-center gap-3 px-4 py-2.5',
          'rounded-full border border-[var(--border)]',
          'bg-[var(--surface-container-low)]',
          'transition-shadow',
          'focus:outline-none',
          isOpen
            ? 'shadow-[var(--shadow-glow-cyan)]'
            : 'hover:shadow-[var(--shadow-glow-cyan)]',
        ].join(' ')}
        style={{
          transition: `box-shadow var(--dur-base, 180ms) var(--ease-standard, cubic-bezier(0.2,0,0,1))`,
        }}
      >
        {/* Waveform motif (static in pill; Echo listening) */}
        <Waveform bars={5} height={14} animated={false} />

        {/* Placeholder text */}
        <span
          className="flex-1 text-left text-sm text-[var(--muted-foreground)] truncate"
          aria-hidden="true"
        >
          Tell Echo anything...
        </span>

        {/* Keyboard hint chip */}
        <span
          className="text-machine shrink-0 rounded px-1.5 py-0.5 border border-[var(--border)] bg-[var(--surface-container)]"
          aria-hidden="true"
        >
          &#8984;K
        </span>
      </button>
    </div>
  );
}
