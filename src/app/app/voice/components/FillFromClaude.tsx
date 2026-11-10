'use client';

import { useState } from 'react';
import { api, VoiceRules, ProfileFieldSuggestions } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { ClaudeLogo } from '@/components/create/ClaudeLogo';
import { VoiceRulesReview, countRules } from '@/components/voice/VoiceRulesReview';
import {
  ProfileFieldsReview,
  EMPTY_CURRENT,
  reviewableFields,
  type CurrentProfileFields,
} from '@/components/voice/ProfileFieldsReview';

// What we ask Claude to write. Business and content only: a user's Claude
// memory can hold private details that have no place in their knowledge base.
// The code block gives the answer a one-click Copy button in Claude. The
// split voice headings keep phrases, banned words and format rules apart.
export const CLAUDE_PROFILE_REQUEST = `I'm setting up EchoMe, an app that writes social media content in my voice. Using what you remember about me and our past conversations, write a profile of me that EchoMe can learn from.

Only include what you actually know about me. Skip anything you would have to guess. Leave out health, family, money and anything private.

If I run more than one business, focus on the one I post about most and list the others in one line under What I offer.

Put the whole profile in one plain-text code block so I can copy it in one click. Use these headings:
- What I do and who I serve
- My audience
- What I offer
- Topics I talk about
- Stories and examples I use
- Phrases I use
- Words and phrases I never use
- Format rules (length, structure, punctuation, hashtags, emojis)
- What I want my content to do

Under 800 words.`;

// Matches the backend's CLAUDE_REQUEST_MARKER: present in the request, never
// in Claude's answer.
const REQUEST_MARKER = 'write a profile of me that EchoMe can learn from';

const MIN_CHARS = 100;

/** Set once a profile is added or the Create card is skipped. */
export const CLAUDE_FILL_DONE_KEY = 'echome_claude_fill_done';

/**
 * Copying the whole Claude message (not the block's Copy button) brings the
 * fences and Claude's notes around the block along. Keep only the block.
 */
export function stripCodeFences(text: string): string {
  const block = text.match(/```[^\n]*\n([\s\S]*?)\n?```/);
  return (block ? block[1] : text).trim();
}

interface FillFromClaudeProps {
  knowledgeBaseId: string | null;
  onAdded: () => void;
  /** Onboarding and Create: show a "Skip for now" beside Ask Claude. */
  onSkip?: () => void;
  className?: string;
}

export function FillFromClaude({
  knowledgeBaseId,
  onAdded,
  onSkip,
  className = 'mb-8 rounded-xl border border-border bg-card p-5',
}: FillFromClaudeProps) {
  const [asked, setAsked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [readingRules, setReadingRules] = useState(false);
  const [suggestions, setSuggestions] = useState<VoiceRules | null>(null);
  const [profileReview, setProfileReview] = useState<{ suggested: ProfileFieldSuggestions; current: CurrentProfileFields } | null>(null);

  const cleaned = stripCodeFences(answer);
  const isRequest = cleaned.includes(REQUEST_MARKER);
  const canSave = !saving && !isRequest && cleaned.length >= MIN_CHARS;

  // Opens Claude with the request filled in. Nothing goes on the clipboard:
  // a copied request is what users then pasted back instead of the answer.
  const askClaude = () => {
    window.open(`https://claude.ai/new?q=${encodeURIComponent(CLAUDE_PROFILE_REQUEST)}`, '_blank', 'noopener,noreferrer');
    setAsked(true);
  };

  const copyRequest = () => {
    navigator.clipboard.writeText(CLAUDE_PROFILE_REQUEST).then(() => setCopied(true)).catch(() => {});
  };

  const finish = () => {
    setAnswer('');
    setAsked(false);
    setSuggestions(null);
    setProfileReview(null);
    onAdded();
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.kbContent.paste({
        text: cleaned,
        title: 'What Claude knows about me',
        sourceType: 'claude_profile',
        knowledgeBaseId: knowledgeBaseId ?? undefined,
      });
      showSuccessToast('Added to your knowledge base', 'Echo will use it for what you talk about and who you talk to.');
      try {
        localStorage.setItem(CLAUDE_FILL_DONE_KEY, new Date().toISOString());
      } catch {
        // per-browser convenience only
      }
    } catch (err) {
      showErrorToast(err, 'Could not save what Claude wrote');
      setSaving(false);
      return;
    }
    setSaving(false);

    // Offer the phrases, never-use words and format rules as voice rules.
    // Any failure just skips the step: the profile is already saved.
    setReadingRules(true);
    // The same call also suggests the always-on profile fields; they are shown
    // first, next to what the user has saved today.
    let found: VoiceRules | null = null;
    let fields: ProfileFieldSuggestions | null = null;
    let current: CurrentProfileFields = EMPTY_CURRENT;
    try {
      const res = await api.voice.suggestRules(cleaned);
      if (res.data && countRules(res.data) > 0) found = res.data;
      fields = res.data?.profile ?? null;
    } catch {
      found = null;
    }
    if (fields) {
      try {
        const p = (await api.auth.getProfile()).data;
        current = {
          bio: p?.bio ?? '',
          role: p?.profile_role ?? '',
          topics: p?.profile_topics ?? '',
          cta: p?.profile_cta ?? '',
          guardrails: p?.profile_guardrails ?? '',
        };
      } catch {
        // Unknown current values: treat as empty would risk overwriting, so skip the step.
        fields = null;
      }
    }
    setReadingRules(false);
    setSuggestions(found);
    if (fields && reviewableFields(fields, current).length > 0) setProfileReview({ suggested: fields, current });
    else if (!found) finish();
  };

  return (
    <div className={className}>
      <p className="text-machine mb-1.5 flex items-center gap-1.5">
        <ClaudeLogo className="h-4 w-4" />
        From Claude
      </p>
      <h2 className="text-lg font-semibold text-foreground">
        Transfer what Claude knows about you into Echo
      </h2>
      <p className="mt-1 text-sm text-text-secondary leading-relaxed mb-4">
        Already use Claude? It knows what you do, who you serve and what you talk about. A couple
        of clicks moves that into Echo, so your knowledge base starts full instead of empty.
      </p>

      {readingRules ? (
        <p className="text-sm text-text-secondary" role="status">Reading your profile...</p>
      ) : profileReview ? (
        <ProfileFieldsReview
          suggested={profileReview.suggested}
          current={profileReview.current}
          onDone={() => (suggestions ? setProfileReview(null) : finish())}
        />
      ) : suggestions ? (
        <VoiceRulesReview suggestions={suggestions} onDone={finish} />
      ) : !asked ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={askClaude}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-[#D97757]/50"
          >
            <ClaudeLogo className="h-4 w-4" decorative />
            Start transfer
          </button>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-2 text-sm text-text-secondary hover:text-foreground"
            >
              Skip for now
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <ol className="list-decimal pl-5 text-sm text-text-secondary leading-relaxed space-y-0.5">
            <li>Claude opened in a new tab with our request filled in. Send it.</li>
            <li>Click Copy on the profile Claude writes.</li>
            <li>Paste it below and add it.</li>
          </ol>
          <p className="text-xs text-text-secondary leading-relaxed">
            Claude shows a caution note on any link that fills in a message. That is normal.
            The request is the one below.
          </p>
          <details className="text-xs text-text-secondary">
            <summary className="cursor-pointer hover:text-foreground">See what we ask Claude</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-bg-secondary p-3 font-sans leading-relaxed">
              {CLAUDE_PROFILE_REQUEST}
            </pre>
            <button type="button" onClick={copyRequest} className="mt-2 text-primary-interactive hover:underline">
              {copied ? 'Copied' : 'Claude opened empty? Copy the request'}
            </button>
          </details>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={saving}
            rows={8}
            placeholder="Paste Claude's reply here"
            aria-label="Claude's reply"
            className="w-full px-3 py-2 border border-border rounded-lg bg-transparent text-sm leading-relaxed focus:outline-none focus:border-accent resize-y disabled:opacity-50"
          />
          {isRequest ? (
            <p role="alert" className="text-xs text-destructive leading-relaxed">
              That&rsquo;s our request, not Claude&rsquo;s answer. Copy Claude&rsquo;s reply and paste that instead.
            </p>
          ) : (
            <p className="text-xs text-text-secondary leading-relaxed">
              Read it first and delete anything you would not want Echo to use. It is saved as its
              own &ldquo;From Claude&rdquo; source: Echo learns your topics and audience from it, but
              not your wording, because these are Claude&rsquo;s words.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Add to my knowledge base'}
            </button>
            <button
              type="button"
              onClick={() => { setAsked(false); setAnswer(''); }}
              disabled={saving}
              className="px-4 py-2 text-sm text-text-secondary hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
