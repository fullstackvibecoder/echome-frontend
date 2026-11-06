'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api, VoiceRules } from '@/lib/api-client';
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast';
import { ClaudeLogo } from '@/components/create/ClaudeLogo';
import { RULE_LISTS, VoiceRulesReview, countRules } from './VoiceRulesReview';

const EMPTY: VoiceRules = { usePhrases: [], neverUse: [], formatRules: [] };

/**
 * Settings: the user's voice rules. Edits save as a whole set. Suggestions
 * from their Fill from Claude profile go through the same review as on Create.
 */
export function VoiceRulesCard() {
  const [rules, setRules] = useState<VoiceRules | null>(null);
  const [drafts, setDrafts] = useState<Record<keyof VoiceRules, string>>({ usePhrases: '', neverUse: '', formatRules: '' });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<VoiceRules | null>(null);

  const load = async () => {
    try {
      const res = await api.voice.getRules();
      setRules(res.data ?? EMPTY);
      setDirty(false);
    } catch {
      setRules(EMPTY);
    }
  };

  useEffect(() => {
    let cancelled = false;
    api.voice
      .getRules()
      .then(res => { if (!cancelled) setRules(res.data ?? EMPTY); })
      .catch(() => { if (!cancelled) setRules(EMPTY); });
    return () => { cancelled = true; };
  }, []);

  if (!rules) return null;

  const remove = (key: keyof VoiceRules, item: string) => {
    setRules({ ...rules, [key]: rules[key].filter(s => s !== item) });
    setDirty(true);
  };

  const add = (key: keyof VoiceRules) => {
    const item = drafts[key].trim();
    if (!item) return;
    if (!rules[key].some(s => s.toLowerCase() === item.toLowerCase())) {
      setRules({ ...rules, [key]: [...rules[key], item] });
      setDirty(true);
    }
    setDrafts({ ...drafts, [key]: '' });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.voice.saveRules(rules);
      setRules(res.data ?? rules);
      setDirty(false);
      showSuccessToast('Voice rules saved');
    } catch (err) {
      showErrorToast(err, 'Could not save your voice rules');
    } finally {
      setSaving(false);
    }
  };

  const suggest = async () => {
    setSuggesting(true);
    try {
      const res = await api.voice.suggestRules();
      if (res.data && countRules(res.data) > 0) setSuggestions(res.data);
      else showInfoToast('Nothing to suggest yet', 'Transfer what Claude knows about you from the Create page first.');
    } catch (err) {
      showErrorToast(err, 'Could not read your Claude profile');
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="card">
      <h3 className="text-subheading text-xl mb-1">Voice rules</h3>
      <p className="text-sm text-text-secondary mb-5">
        Rules you set for how Echo writes as you. Echo follows them in everything it makes.
      </p>

      {suggestions ? (
        <VoiceRulesReview
          suggestions={suggestions}
          onDone={(saved) => {
            setSuggestions(null);
            if (saved) void load();
          }}
        />
      ) : (
        <div className="space-y-6">
          {RULE_LISTS.map(({ key, title, hint }) => (
            <div key={key}>
              <p className="text-small font-medium text-text-primary">{title}</p>
              <p className="text-xs text-text-secondary mb-2">{hint}</p>
              {rules[key].length > 0 && (
                <ul className="mb-2 flex flex-wrap gap-2">
                  {rules[key].map(item => (
                    <li key={item} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-sm">
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => remove(key, item)}
                        aria-label={`Remove ${item}`}
                        className="p-0.5 text-text-secondary hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <form
                onSubmit={(e) => { e.preventDefault(); add(key); }}
                className="flex gap-2"
              >
                <input
                  value={drafts[key]}
                  onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })}
                  maxLength={200}
                  aria-label={`Add to ${title}`}
                  placeholder="Add one"
                  className="flex-1 px-3 py-2 border-2 border-border rounded-lg input-glow text-sm"
                />
                <button type="submit" className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted">
                  Add
                </button>
              </form>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save voice rules'}
            </button>
            <button
              type="button"
              onClick={suggest}
              disabled={suggesting || dirty}
              title={dirty ? 'Save your changes first' : undefined}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:border-[#D97757]/50 disabled:opacity-50"
            >
              <ClaudeLogo className="h-4 w-4" decorative />
              {suggesting ? 'Reading...' : 'Suggest from my Claude profile'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
