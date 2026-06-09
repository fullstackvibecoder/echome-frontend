'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Check, X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface Candidate {
  url: string;
  name: string;
}

interface IsThisYouModalProps {
  candidates: Candidate[];
  onResolve: (confirmedUrls: string[]) => void;
  onClose?: () => void;
}

// Mirror the host file's prettySource helper so candidate links read cleanly.
function prettySource(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * "Is this you?" disambiguation modal. Shown when the WBTW lookup surfaced
 * multiple possible people for the same name and needs the user to confirm
 * which results are actually them before we ingest anything.
 *
 * Each candidate starts unselected; the user marks the ones that are them
 * and hits Done, which returns the confirmed URLs to the parent.
 */
export default function IsThisYouModal({
  candidates,
  onResolve,
  onClose,
}: IsThisYouModalProps) {
  const containerRef = useFocusTrap(true);
  // Track which candidate URLs the user has confirmed are them.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const setChoice = (url: string, isMe: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (isMe) next.add(url);
      else next.delete(url);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Is this you?"
        className="relative bg-card rounded-xl p-6 shadow-2xl border border-border max-w-md w-full mx-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-9 h-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: '0 0 20px rgba(0, 212, 255, 0.15)' }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Is this you?</h2>
        </div>
        <p className="text-text-secondary text-sm mb-5">
          I found a few people with that name. Tell me which ones are you so I
          only learn from the right content.
        </p>

        <div className="space-y-2.5 mb-6">
          {candidates.map(candidate => {
            const isMe = selected.has(candidate.url);
            return (
              <div
                key={candidate.url}
                className="rounded-xl border border-border bg-bg-secondary px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {candidate.name}
                    </p>
                    <a
                      href={candidate.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-text-tertiary hover:underline truncate block"
                    >
                      {prettySource(candidate.url)}
                    </a>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setChoice(candidate.url, true)}
                      aria-pressed={isMe}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                        isMe
                          ? 'bg-accent text-white'
                          : 'border border-border text-text-secondary hover:text-text-primary hover:bg-card'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Yes, that&apos;s me
                    </button>
                    <button
                      type="button"
                      onClick={() => setChoice(candidate.url, false)}
                      aria-pressed={!isMe}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                        !isMe
                          ? 'bg-bg-secondary border border-border text-text-primary'
                          : 'text-text-tertiary hover:text-text-primary hover:bg-card'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      Not me
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onResolve(Array.from(selected))}
            className="px-5 py-2.5 bg-accent text-white text-sm rounded-xl font-semibold hover:bg-accent/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
