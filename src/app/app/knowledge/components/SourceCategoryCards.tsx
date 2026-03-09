'use client';

import { UnifiedContentItem } from '@/types';

interface SourceCategoryCardsProps {
  bySourceType: Record<string, number>;
  contentItems: UnifiedContentItem[];
  mboxUploading: boolean;
  onOpenModal: (modal: string) => void;
  onFilterByCategory: (sourceType: string) => void;
}

interface CategoryDef {
  label: string;
  icon: string;
  sourceTypes: string[];
  modal: string;
}

const CATEGORIES: CategoryDef[] = [
  { label: 'Voice', icon: '🎤', sourceTypes: ['voice_recording'], modal: 'voice' },
  { label: 'Social', icon: '📱', sourceTypes: ['youtube_import', 'instagram_import'], modal: 'social' },
  { label: 'Blog', icon: '📝', sourceTypes: ['blog_import'], modal: 'blog' },
  { label: 'Email', icon: '📧', sourceTypes: ['mbox_import'], modal: 'email' },
  { label: 'Writing', icon: '✍️', sourceTypes: ['paste_text', 'paste_social', 'paste_email'], modal: 'paste' },
  { label: 'Files', icon: '📤', sourceTypes: ['file_upload'], modal: 'upload' },
];

export function SourceCategoryCards({
  bySourceType,
  contentItems,
  mboxUploading,
  onOpenModal,
  onFilterByCategory,
}: SourceCategoryCardsProps) {

  function getCategoryStats(cat: CategoryDef) {
    let itemCount = 0;
    let nuggetCount = 0;
    for (const item of contentItems) {
      if (cat.sourceTypes.includes(item.sourceType)) {
        itemCount++;
        nuggetCount += item.chunkCount || 0;
      }
    }
    return { itemCount, nuggetCount };
  }

  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-wider font-medium mb-3 text-text-secondary">Sources</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger-children">
        {CATEGORIES.map(cat => {
          const { itemCount, nuggetCount } = getCategoryStats(cat);
          const isEmpty = itemCount === 0;
          const isEmailDisabled = cat.modal === 'email' && mboxUploading;

          return (
            <div
              key={cat.label}
              className={`
                relative p-4 rounded-xl border text-center transition-all
                ${isEmpty
                  ? 'border-dashed border-border'
                  : 'border-border bg-card card-lift'
                }
                ${isEmailDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <button
                onClick={() => {
                  if (!isEmpty) {
                    const matchingType = cat.sourceTypes.find(st => (bySourceType[st] || 0) > 0);
                    if (matchingType) onFilterByCategory(matchingType);
                  } else {
                    onOpenModal(cat.modal);
                  }
                }}
                disabled={isEmailDisabled}
                className="w-full"
              >
                <div className="text-2xl mb-1">{cat.icon}</div>
                <div className="text-sm font-medium text-text-primary">{cat.label}</div>
                {isEmpty ? (
                  <div className="text-xs text-accent font-medium mt-1">+ Add</div>
                ) : (
                  <div className="text-xs text-text-secondary mt-1">
                    {itemCount} item{itemCount !== 1 ? 's' : ''} · {nuggetCount} nuggets
                  </div>
                )}
              </button>
              {!isEmpty && (
                <button
                  onClick={() => onOpenModal(cat.modal)}
                  disabled={isEmailDisabled}
                  className="mt-2 text-xs text-accent hover:text-accent/80 font-medium transition-colors disabled:opacity-50"
                >
                  + Add more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
