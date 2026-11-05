'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

// What we ask Claude to write. Business and content only: a user's Claude
// memory can hold private details that have no place in their knowledge base.
export const CLAUDE_PROFILE_REQUEST = `I'm setting up EchoMe, an app that writes social media content in my voice. Using what you remember about me and our past conversations, write a profile of me that EchoMe can learn from.

Only include what you actually know about me. Skip anything you would have to guess. Leave out health, family, money and anything private.

Use these headings:
- What I do and who I serve
- My audience
- What I offer
- Topics I talk about
- Stories and examples I use
- How I sound: words and phrases I use, and things I would never say
- What I want my content to do

Plain text, under 800 words.`;

const MIN_CHARS = 100;

interface FillFromClaudeProps {
  knowledgeBaseId: string | null;
  onAdded: () => void;
}

export function FillFromClaude({ knowledgeBaseId, onAdded }: FillFromClaudeProps) {
  const [asked, setAsked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  // Both calls start inside the click: awaiting the clipboard first loses the
  // user gesture and Safari then blocks the new tab.
  const askClaude = () => {
    window.open(`https://claude.ai/new?q=${encodeURIComponent(CLAUDE_PROFILE_REQUEST)}`, '_blank', 'noopener,noreferrer');
    navigator.clipboard.writeText(CLAUDE_PROFILE_REQUEST).then(() => setCopied(true)).catch(() => setCopied(false));
    setAsked(true);
  };

  const save = async () => {
    if (answer.trim().length < MIN_CHARS) return;
    setSaving(true);
    try {
      await api.kbContent.paste({
        text: answer.trim(),
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
        <button type="button" onClick={askClaude} className="btn-primary px-4 py-2 text-sm">
          Ask Claude
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary leading-relaxed">
            Claude opened in a new tab with the request filled in.
            {copied ? ' If it is empty, paste: the request is on your clipboard.' : ''}
            {' '}When Claude answers, copy its reply and paste it here.
          </p>
          {!copied && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(CLAUDE_PROFILE_REQUEST).then(() => setCopied(true)).catch(() => {})}
              className="text-xs text-primary-interactive hover:underline"
            >
              Copy the request
            </button>
          )}
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={saving}
            rows={8}
            placeholder="Paste Claude's reply here"
            aria-label="Claude's reply"
            className="w-full px-3 py-2 border border-border rounded-lg bg-transparent text-sm leading-relaxed focus:outline-none focus:border-accent resize-y disabled:opacity-50"
          />
          <p className="text-xs text-text-secondary leading-relaxed">
            Read it first and delete anything you would not want Echo to use. It is saved as its
            own &ldquo;From Claude&rdquo; source: Echo learns your topics and audience from it, but
            not your wording, because these are Claude&rsquo;s words.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving || answer.trim().length < MIN_CHARS}
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
