'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';

type ContentSourceType = 'writing_sample' | 'social_post' | 'email' | 'text';

interface ContentType {
  id: ContentSourceType;
  name: string;
  description: string;
  icon: string;
}

const CONTENT_TYPES: ContentType[] = [
  {
    id: 'writing_sample',
    name: 'Writing Sample',
    description: 'Blog posts, articles, or any long-form writing',
    icon: '✍️',
  },
  {
    id: 'social_post',
    name: 'Social Post',
    description: 'Instagram captions, tweets, LinkedIn posts',
    icon: '📱',
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Emails that showcase your communication style',
    icon: '📧',
  },
  {
    id: 'text',
    name: 'General Text',
    description: 'Any other text content',
    icon: '📝',
  },
];

interface PasteContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  knowledgeBaseId?: string;
}

export function PasteContentModal({
  isOpen,
  onClose,
  onSuccess,
  knowledgeBaseId,
}: PasteContentModalProps) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<ContentSourceType>('writing_sample');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const characterCount = text.length;
  const isValid = characterCount >= 50 && characterCount <= 500000;

  const handleSubmit = async () => {
    if (!isValid) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.kbContent.paste({
        text,
        title: title.trim() || undefined,
        sourceType,
        knowledgeBaseId,
      });

      // Reset form
      setText('');
      setTitle('');
      setSourceType('writing_sample');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save content');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setText('');
      setTitle('');
      setSourceType('writing_sample');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-subheading text-2xl">Paste Your Content</h2>
              <p className="text-body text-text-secondary text-sm mt-1">
                Add writing samples to train your voice
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="text-text-secondary hover:text-text-primary text-2xl disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Content Type Selection */}
          <div className="mb-6">
            <label className="block text-body font-medium mb-3">
              What type of content is this?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSourceType(type.id)}
                  disabled={submitting}
                  className={`
                    p-3 rounded-lg border-2 text-left transition-all
                    ${
                      sourceType === type.id
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-accent/50'
                    }
                    ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{type.icon}</span>
                    <span className="font-medium">{type.name}</span>
                  </div>
                  <p className="text-xs text-text-secondary">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div className="mb-4">
            <label className="block text-body font-medium mb-2">
              Title <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              placeholder="e.g., My LinkedIn About Section"
              className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
            />
          </div>

          {/* Text Content */}
          <div className="mb-4">
            <label className="block text-body font-medium mb-2">
              Your Content
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={submitting}
              placeholder="Paste your writing here... This could be a blog post, email, social caption, or any content that represents your voice."
              rows={10}
              className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors resize-none disabled:opacity-50"
            />
            <div className="flex justify-between mt-2 text-sm">
              <span
                className={`${
                  characterCount < 50
                    ? 'text-amber-600'
                    : characterCount > 500000
                    ? 'text-red-600'
                    : 'text-text-secondary'
                }`}
              >
                {characterCount < 50
                  ? `${50 - characterCount} more characters needed`
                  : characterCount > 500000
                  ? 'Content too long'
                  : `${characterCount.toLocaleString()} characters`}
              </span>
              <span className="text-text-secondary">Min: 50 | Max: 500,000</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 px-4 py-3 border-2 border-border rounded-lg text-body hover:border-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                'Add to Knowledge Base'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
