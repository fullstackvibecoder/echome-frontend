'use client';

import { useState } from 'react';
import { api, VoiceRules } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

export const RULE_LISTS: { key: keyof VoiceRules; title: string; hint: string }[] = [
  { key: 'formatRules', title: 'How you write', hint: 'Echo follows these every time.' },
  { key: 'usePhrases', title: 'Phrases you use', hint: 'Echo uses one only where it fits.' },
  { key: 'neverUse', title: 'Never use', hint: 'Echo keeps these out.' },
];

/** Adds `extra` to `base`, skipping case-insensitive duplicates. */
export function mergeRules(base: VoiceRules, extra: VoiceRules): VoiceRules {
  const merge = (a: string[], b: string[]) => {
    const seen = new Set(a.map(s => s.toLowerCase()));
    return [...a, ...b.filter(s => !seen.has(s.toLowerCase()))];
  };
  return {
    usePhrases: merge(base.usePhrases, extra.usePhrases),
    neverUse: merge(base.neverUse, extra.neverUse),
    formatRules: merge(base.formatRules, extra.formatRules),
  };
}

export function countRules(rules: VoiceRules): number {
  return rules.usePhrases.length + rules.neverUse.length + rules.formatRules.length;
}

interface VoiceRulesReviewProps {
  suggestions: VoiceRules;
  /** Called after saving (true) or skipping (false). */
  onDone: (saved: boolean) => void;
}

/**
 * Suggested voice rules, all ticked. Saving adds the ticked ones to the
 * user's existing rules; nothing already saved is removed.
 */
export function VoiceRulesReview({ suggestions, onDone }: VoiceRulesReviewProps) {
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const id = (key: keyof VoiceRules, item: string) => `${key}:${item}`;
  const toggle = (key: keyof VoiceRules, item: string) => {
    setUnticked(prev => {
      const next = new Set(prev);
      const k = id(key, item);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const ticked: VoiceRules = {
    usePhrases: suggestions.usePhrases.filter(s => !unticked.has(id('usePhrases', s))),
    neverUse: suggestions.neverUse.filter(s => !unticked.has(id('neverUse', s))),
    formatRules: suggestions.formatRules.filter(s => !unticked.has(id('formatRules', s))),
  };

  const save = async () => {
    setSaving(true);
    try {
      const current = await api.voice.getRules();
      const base = current.data ?? { usePhrases: [], neverUse: [], formatRules: [] };
      await api.voice.saveRules(mergeRules(base, ticked));
      showSuccessToast('Saved to your voice', 'Echo will follow these in everything it writes.');
      onDone(true);
    } catch (err) {
      showErrorToast(err, 'Could not save your voice rules');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Echo found your voice rules</p>
        <p className="text-xs text-text-secondary leading-relaxed">
          Untick anything that is not right. You can change these any time in Settings.
        </p>
      </div>
      {RULE_LISTS.map(({ key, title, hint }) =>
        suggestions[key].length ? (
          <fieldset key={key}>
            <legend className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{title}</legend>
            <p className="text-xs text-text-secondary mb-1.5">{hint}</p>
            <ul className="space-y-1">
              {suggestions[key].map(item => (
                <li key={item}>
                  <label className="flex items-start gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={!unticked.has(id(key, item))}
                      onChange={() => toggle(key, item)}
                    />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null,
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || countRules(ticked) === 0}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : `Save ${countRules(ticked)} to my voice`}
        </button>
        <button
          type="button"
          onClick={() => onDone(false)}
          disabled={saving}
          className="px-4 py-2 text-sm text-text-secondary hover:text-foreground disabled:opacity-50"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
