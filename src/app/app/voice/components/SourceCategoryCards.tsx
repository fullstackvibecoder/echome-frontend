'use client';

import { UnifiedContentItem } from '@/types';
import { Mic, MessageSquare, FileText, Mail, PenLine, Upload, LucideIcon } from 'lucide-react';

interface SourceCategoryCardsProps {
  bySourceType: Record<string, number>;
  contentItems: UnifiedContentItem[];
  mboxUploading: boolean;
  onFilterByCategory: (sourceType: string) => void;
}

interface CategoryDef {
  label: string;
  icon: LucideIcon;
  sourceTypes: string[];
  modal: string;
  accent: {
    bg: string;
    text: string;
    border: string;
    iconBg: string;
  };
}

const CATEGORIES: CategoryDef[] = [
  {
    label: 'Voice',
    icon: Mic,
    sourceTypes: ['voice_recording'],
    modal: 'voice',
    accent: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
      border: 'border-emerald-500/30',
      iconBg: 'bg-emerald-500/15',
    },
  },
  {
    label: 'Social',
    icon: MessageSquare,
    sourceTypes: ['youtube_import', 'instagram_import'],
    modal: 'social',
    accent: {
      bg: 'bg-pink-500/10',
      text: 'text-pink-500',
      border: 'border-pink-500/30',
      iconBg: 'bg-pink-500/15',
    },
  },
  {
    label: 'Blog',
    icon: FileText,
    sourceTypes: ['blog_import'],
    modal: 'blog',
    accent: {
      bg: 'bg-teal-500/10',
      text: 'text-teal-500',
      border: 'border-teal-500/30',
      iconBg: 'bg-teal-500/15',
    },
  },
  {
    label: 'Email',
    icon: Mail,
    sourceTypes: ['mbox_import'],
    modal: 'email',
    accent: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-500',
      border: 'border-amber-500/30',
      iconBg: 'bg-amber-500/15',
    },
  },
  {
    label: 'Writing',
    icon: PenLine,
    sourceTypes: ['paste_text', 'paste_social', 'paste_email'],
    modal: 'paste',
    accent: {
      bg: 'bg-violet-500/10',
      text: 'text-violet-500',
      border: 'border-violet-500/30',
      iconBg: 'bg-violet-500/15',
    },
  },
  {
    label: 'Files',
    icon: Upload,
    sourceTypes: ['file_upload'],
    modal: 'upload',
    accent: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-500',
      border: 'border-blue-500/30',
      iconBg: 'bg-blue-500/15',
    },
  },
];

export function SourceCategoryCards({
  bySourceType,
  contentItems,
  mboxUploading,
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
      <p className="text-xs uppercase tracking-wider font-medium mb-3 text-text-secondary">
        Sources
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CATEGORIES.map((cat) => {
          const { itemCount, nuggetCount } = getCategoryStats(cat);
          const isEmpty = itemCount === 0;
          const isEmailDisabled = cat.modal === 'email' && mboxUploading;
          const Icon = cat.icon;

          return (
            <div
              key={cat.label}
              className={`
                relative rounded-xl transition-all duration-200 ease-out
                ${isEmpty
                  ? `border border-dashed ${cat.accent.border} ${cat.accent.bg}`
                  : 'border border-border bg-card shadow-sm'
                }
                ${isEmailDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}
              `}
            >
              <button
                onClick={() => {
                  if (!isEmpty) {
                    const matchingType = cat.sourceTypes.find(
                      (st) => (bySourceType[st] || 0) > 0
                    );
                    if (matchingType) onFilterByCategory(matchingType);
                  }
                }}
                disabled={isEmailDisabled || isEmpty}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${cat.accent.iconBg}`}
                  >
                    <Icon className={`w-5 h-5 ${cat.accent.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-text-primary">
                      {cat.label}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
