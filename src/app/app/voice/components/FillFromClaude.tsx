'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

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

/** Copying the whole Claude message (not the block's Copy button) brings the fences along. */
export function stripCodeFences(text: string): string {
  return text.trim().replace(/^```[a-z]*\s*\n/i, '').replace(/\n?```\s*$/, '').trim();
}

interface FillFromClaudeProps {
  knowledgeBaseId: string | null;
  onAdded: () => void;
  /** Onboarding: show a "Skip for now" beside Ask Claude. */
  onSkip?: () => void;
}

export function FillFromClaude({ knowledgeBaseId, onAdded, onSkip }: FillFromClaudeProps) {
  const [asked, setAsked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

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
      setAnswer('');
      setAsked(false);
      onAdded();
    } catch (err) {
      showErrorToast(err, 'Could not save what Claude wrote');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-5">
      <p className="text-machine mb-1.5">Fill from Claude</p>
      <p className="text-sm text-text-secondary leading-relaxed mb-3">
        Already use Claude? It knows what you do, who you serve and what you talk about.
        Let it write that down for Echo in one go.
      </p>

      {!asked ? (
        <div className="flex gap-2">
          <button type="button" onClick={askClaude} className="btn-primary px-4 py-2 text-sm">
            Ask Claude
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
          <p className="text-sm text-text-secondary leading-relaxed">
            Claude opened in a new tab with our request filled in. Send it, then click Copy on
            the profile Claude writes and paste it here.
          </p>
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
