'use client';

import { useState } from 'react';
import { InfoTooltip } from '@/components/info-tooltip';

interface AddContentButton {
  key: string;
  icon: string;
  label: string;
  modal: string;
  title: string;
}

const ALL_BUTTONS: AddContentButton[] = [
  { key: 'voice', icon: '🎤', label: 'Voice', modal: 'voice', title: 'Record yourself talking' },
  { key: 'social', icon: '📱', label: 'Social', modal: 'social', title: 'Import from YouTube or Instagram' },
  { key: 'blog', icon: '📝', label: 'Blog', modal: 'blog', title: 'Import articles from your blog' },
  { key: 'email', icon: '📧', label: 'Email', modal: 'email', title: 'Import emails you\'ve sent' },
  { key: 'paste', icon: '✍️', label: 'Paste', modal: 'paste', title: 'Copy & paste any text you\'ve written' },
  { key: 'upload', icon: '📤', label: 'Upload', modal: 'upload', title: 'Upload documents (PDF, Word, TXT)' },
];

function getSmartLayout(bySourceType: Record<string, number>): {
  primary: AddContentButton;
  secondary: AddContentButton[];
  more: AddContentButton[];
} {
  const hasVoice = (bySourceType['voice_recording'] || 0) > 0;
  const hasSocial = (bySourceType['youtube_import'] || 0) > 0 || (bySourceType['instagram_import'] || 0) > 0;
  const hasBlog = (bySourceType['blog_import'] || 0) > 0;

  let primaryKey: string;
  if (!hasVoice) primaryKey = 'voice';
  else if (!hasSocial) primaryKey = 'social';
  else if (!hasBlog) primaryKey = 'blog';
  else primaryKey = 'upload';

  const primary = ALL_BUTTONS.find(b => b.key === primaryKey)!;
  const remaining = ALL_BUTTONS.filter(b => b.key !== primaryKey);

  // Show 3 secondary, rest in "more"
  const secondary = remaining.slice(0, 3);
  const more = remaining.slice(3);

  return { primary, secondary, more };
}

interface AddContentSectionProps {
  bySourceType: Record<string, number>;
  mboxUploading: boolean;
  onOpenModal: (modal: string) => void;
}

export function AddContentSection({ bySourceType, mboxUploading, onOpenModal }: AddContentSectionProps) {
  const [showMore, setShowMore] = useState(false);
  const { primary, secondary, more } = getSmartLayout(bySourceType);

  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-3">
        Add Content
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {/* Primary CTA */}
        <button
          onClick={() => onOpenModal(primary.modal)}
          disabled={primary.modal === 'email' && mboxUploading}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
          title={primary.title}
        >
          <span>{primary.icon}</span> {primary.label}
        </button>

        {/* Secondary buttons */}
        {secondary.map(btn => (
          <button
            key={btn.key}
            onClick={() => onOpenModal(btn.modal)}
            disabled={btn.modal === 'email' && mboxUploading}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-all text-sm font-medium disabled:opacity-50"
            title={btn.title}
          >
            <span>{btn.icon}</span> {btn.label}
          </button>
        ))}

        {/* More sources disclosure */}
        {more.length > 0 && !showMore && (
          <button
            onClick={() => setShowMore(true)}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors px-3 py-2.5"
          >
            More sources...
          </button>
        )}

        {showMore && more.map(btn => (
          <button
            key={btn.key}
            onClick={() => onOpenModal(btn.modal)}
            disabled={btn.modal === 'email' && mboxUploading}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-border rounded-xl hover:border-accent hover:bg-accent/5 transition-all text-sm font-medium disabled:opacity-50"
            title={btn.title}
          >
            <span>{btn.icon}</span> {btn.label}
          </button>
        ))}

        <InfoTooltip text="Upload blog posts, articles, PDFs, docs, or email exports. EchoMe analyzes your writing patterns to match your unique voice." />
      </div>
    </div>
  );
}
