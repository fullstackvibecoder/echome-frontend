'use client';

import { useState } from 'react';
import { api, ProfileFieldSuggestions } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { UserProfileUpdate } from '@/types';

type FieldKey = keyof ProfileFieldSuggestions;

/** Current values as stored on the user, keyed like the suggestions. */
export type CurrentProfileFields = Record<FieldKey, string>;

export const PROFILE_FIELDS: { key: FieldKey; label: string; column: keyof UserProfileUpdate }[] = [
  { key: 'bio', label: 'Bio', column: 'bio' },
  { key: 'role', label: 'Role', column: 'profile_role' },
  { key: 'topics', label: 'Topics you talk about', column: 'profile_topics' },
  { key: 'cta', label: 'What your content should do', column: 'profile_cta' },
  { key: 'guardrails', label: 'Things to avoid', column: 'profile_guardrails' },
];

export const EMPTY_CURRENT: CurrentProfileFields = { bio: '', role: '', topics: '', cta: '', guardrails: '' };

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** Fields worth showing: Claude has something to say and it differs from what is saved. */
export function reviewableFields(suggested: ProfileFieldSuggestions, current: CurrentProfileFields) {
  return PROFILE_FIELDS.filter(({ key }) => {
    const next = (suggested[key] ?? '').trim();
    return next && norm(next) !== norm(current[key] ?? '');
  });
}

interface ProfileFieldsReviewProps {
  suggested: ProfileFieldSuggestions;
  current: CurrentProfileFields;
  /** Called after saving (true) or skipping (false). */
  onDone: (saved: boolean) => void;
}

/**
 * Suggested profile fields next to the saved ones. A field with nothing saved
 * is ticked; a field that would replace something is not, and swaps in one click.
 * These fields go into every generation, so nothing replaces a value unasked.
 */
export function ProfileFieldsReview({ suggested, current, onDone }: ProfileFieldsReviewProps) {
  const fields = reviewableFields(suggested, current);
  const [use, setUse] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(fields.map(({ key }) => [key, !(current[key] ?? '').trim()])),
  );
  const [saving, setSaving] = useState(false);

  const chosen = fields.filter(({ key }) => use[key]);

  const save = async () => {
    setSaving(true);
    try {
      const updates: Record<string, string> = {};
      for (const { key, column } of chosen) updates[column] = (suggested[key] ?? '').trim();
      await api.auth.updateProfile(updates as UserProfileUpdate);
      showSuccessToast('Profile updated', 'Echo will use this in everything it writes.');
      onDone(true);
    } catch (err) {
      showErrorToast(err, 'Could not update your profile');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Echo found details for your profile</p>
        <p className="text-xs text-text-secondary leading-relaxed">
          Echo reads these before every post. Where you already have something saved, pick which to keep.
          You can edit them any time in Settings.
        </p>
      </div>
      {fields.map(({ key, label }) => {
        const saved = (current[key] ?? '').trim();
        const next = (suggested[key] ?? '').trim();
        return (
          <fieldset key={key} className="space-y-1.5">
            <legend className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</legend>
            {saved ? (
              <>
                <label className="flex items-start gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name={`profile-${key}`}
                    className="mt-1"
                    checked={!use[key]}
                    onChange={() => setUse(p => ({ ...p, [key]: false }))}
                  />
                  <span><span className="text-text-secondary">Keep mine: </span>{saved}</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name={`profile-${key}`}
                    className="mt-1"
                    checked={Boolean(use[key])}
                    onChange={() => setUse(p => ({ ...p, [key]: true }))}
                  />
                  <span><span className="text-text-secondary">Use Claude&rsquo;s: </span>{next}</span>
                </label>
              </>
            ) : (
              <label className="flex items-start gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(use[key])}
                  onChange={() => setUse(p => ({ ...p, [key]: !p[key] }))}
                />
                <span>{next}</span>
              </label>
            )}
          </fieldset>
        );
      })}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || chosen.length === 0}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : `Save ${chosen.length} to my profile`}
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
