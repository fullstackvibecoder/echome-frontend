'use client';

/**
 * Red-word picker — lets the user pick which word in a cover or last-slide
 * headline renders in red. Renders the headline as a row of clickable word
 * chips; the currently-selected word is highlighted. Click another word to
 * swap. Click the current selection to clear (no red word at all).
 *
 * Used inside CarouselEditorModal for active slides whose template is
 * `branded-overlay-cover` or `branded-overlay-last`. Body slides don't
 * render this picker — red emphasis is forbidden on body slides per the
 * design rules.
 */

interface RedWordPickerProps {
  /** Current slide text (with or without `**word**` markers). */
  text: string;
  /** Currently-selected red word, if any. Caller tracks this in editor state. */
  selectedWord?: string;
  /** Fired when user clicks a chip. word=undefined means "no red word". */
  onChange: (word: string | undefined) => void;
}

// Stop words and 1-2 char tokens are still selectable (in case the user wants
// "one" or "5" highlighted) but visually de-emphasized as poor candidates.
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'for', 'in', 'on', 'at',
  'by', 'my', 'your', 'our', 'is', 'was', 'are', 'be', 'this', 'that', 'it',
  'with', 'from', 'as', 'so', 'if', 'when', 'how', 'what', 'who',
]);

export function RedWordPicker({ text, selectedWord, onChange }: RedWordPickerProps) {
  // Strip any existing **markers** so we render plain words only.
  const stripped = text.replace(/\*\*(.+?)\*\*/g, '$1');
  // Keep punctuation outside the chips: split on whitespace, then strip
  // surrounding punctuation for the chip label and the click value.
  const tokens = stripped.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Red word</h4>
        {selectedWord && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-text-tertiary hover:text-text-secondary underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <p className="text-xs text-text-tertiary">
        Pick the word that should pop. Numbers, surprising verbs, and stake-words land hardest.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tokens.map((tok, i) => {
          const core = tok.replace(/^[^\w'-]+|[^\w'-]+$/g, ''); // strip surrounding punct
          if (!core) return null;
          const lower = core.toLowerCase();
          const isStop = STOP_WORDS.has(lower);
          const isSelected = selectedWord && selectedWord.toLowerCase() === lower;
          return (
            <button
              key={`${i}-${core}`}
              type="button"
              onClick={() => onChange(isSelected ? undefined : core)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all border ${
                isSelected
                  ? 'bg-error/15 text-error border-error/40 ring-2 ring-error/20'
                  : isStop
                    ? 'bg-card text-text-tertiary border-border/40 hover:border-border'
                    : 'bg-card text-foreground border-border hover:border-error/40 hover:text-error'
              }`}
              aria-pressed={!!isSelected}
              title={isSelected ? 'Click to remove red emphasis' : `Mark "${core}" red`}
            >
              {tok}
            </button>
          );
        })}
      </div>
    </div>
  );
}
