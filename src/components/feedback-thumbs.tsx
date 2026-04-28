'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { api } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

type Feedback = 'good' | 'bad';

interface FeedbackThumbsProps {
  contentId: string;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function FeedbackThumbs({ contentId, label, compact = false, className }: FeedbackThumbsProps) {
  const [submitted, setSubmitted] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(feedback: Feedback) {
    if (submitted || loading) return;
    setLoading(true);
    try {
      await api.generation.provideFeedback(contentId, feedback);
      setSubmitted(feedback);
      showSuccessToast(
        feedback === 'good' ? 'Thanks — noted what you liked' : "Thanks — we'll learn from that"
      );
    } catch (err) {
      showErrorToast(err, 'submitting feedback');
    } finally {
      setLoading(false);
    }
  }

  const size = compact ? 14 : 16;
  const padding = compact ? 'p-1' : 'p-1.5';
  const disabled = loading || submitted !== null;

  const upClass = submitted === 'good'
    ? 'bg-green-500/10 text-green-500'
    : submitted === null
    ? 'text-muted-foreground hover:bg-bg-tertiary hover:text-foreground'
    : 'text-muted-foreground/40';

  const downClass = submitted === 'bad'
    ? 'bg-red-500/10 text-red-500'
    : submitted === null
    ? 'text-muted-foreground hover:bg-bg-tertiary hover:text-foreground'
    : 'text-muted-foreground/40';

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
      {label && !compact && <span className="text-xs text-muted-foreground">{label}</span>}
      <button
        type="button"
        onClick={() => submit('good')}
        disabled={disabled}
        className={`rounded transition-colors disabled:cursor-not-allowed ${padding} ${upClass}`}
        aria-label="This is good"
        title="This is on-voice"
      >
        <ThumbsUp size={size} />
      </button>
      <button
        type="button"
        onClick={() => submit('bad')}
        disabled={disabled}
        className={`rounded transition-colors disabled:cursor-not-allowed ${padding} ${downClass}`}
        aria-label="This needs work"
        title="This needs work"
      >
        <ThumbsDown size={size} />
      </button>
    </div>
  );
}
