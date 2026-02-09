'use client';

/**
 * Sequence Arranger Component
 *
 * Dynamic labeled sections for tutorials, day-in-life, step-by-step content.
 * Users can add/remove sections, each with a label and media.
 */

import { useState, useRef, useCallback } from 'react';
import type { ReelMediaType } from '@/types';
import type { MediaItem } from './MediaUploader';

export interface SequenceSection {
  id: string;
  label: string;
  item: MediaItem | null;
}

interface SequenceArrangerProps {
  sections: SequenceSection[];
  onSectionsChange: (sections: SequenceSection[]) => void;
  variant?: 'tutorial' | 'dayinlife' | 'custom';
  minSections?: number;
  maxSections?: number;
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const DEFAULT_LABELS = {
  tutorial: ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5', 'Step 6'],
  dayinlife: ['Morning', 'Midday', 'Afternoon', 'Evening', 'Night', 'Late Night'],
  custom: ['Section 1', 'Section 2', 'Section 3', 'Section 4', 'Section 5', 'Section 6'],
};

const VARIANT_INFO = {
  tutorial: {
    icon: '📚',
    title: 'Tutorial Walkthrough',
    description: 'Step-by-step guide format. Perfect for how-to content.',
    gradient: 'from-blue-500/10 to-cyan-500/10',
    border: 'border-blue-500/20',
  },
  dayinlife: {
    icon: '☀️',
    title: 'Day in the Life',
    description: 'Time-based story format. Great for lifestyle and routine content.',
    gradient: 'from-amber-500/10 to-orange-500/10',
    border: 'border-amber-500/20',
  },
  custom: {
    icon: '✏️',
    title: 'Story Sequence',
    description: 'Custom labeled sections. Name each part of your story.',
    gradient: 'from-violet-500/10 to-purple-500/10',
    border: 'border-violet-500/20',
  },
};

export function SequenceArranger({
  sections,
  onSectionsChange,
  variant = 'tutorial',
  minSections = 3,
  maxSections = 6,
}: SequenceArrangerProps) {
  const info = VARIANT_INFO[variant];
  const defaultLabels = DEFAULT_LABELS[variant];

  const generateId = () => `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addSection = () => {
    if (sections.length >= maxSections) return;
    const newLabel = defaultLabels[sections.length] || `Section ${sections.length + 1}`;
    onSectionsChange([
      ...sections,
      { id: generateId(), label: newLabel, item: null },
    ]);
  };

  const removeSection = (id: string) => {
    if (sections.length <= minSections) return;
    onSectionsChange(sections.filter(s => s.id !== id));
  };

  const updateLabel = (id: string, label: string) => {
    onSectionsChange(sections.map(s =>
      s.id === id ? { ...s, label } : s
    ));
  };

  const updateItem = (id: string, item: MediaItem | null) => {
    onSectionsChange(sections.map(s =>
      s.id === id ? { ...s, item } : s
    ));
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    const newSections = [...sections];
    const [moved] = newSections.splice(fromIndex, 1);
    newSections.splice(toIndex, 0, moved);
    onSectionsChange(newSections);
  };

  const filledCount = sections.filter(s => s.item !== null).length;

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className={`bg-gradient-to-r ${info.gradient} border ${info.border} rounded-xl p-4`}>
        <div className="flex items-start gap-3">
          <div className="text-2xl">{info.icon}</div>
          <div className="flex-1">
            <h3 className="font-medium text-text-primary">{info.title}</h3>
            <p className="text-sm text-text-secondary mt-1">{info.description}</p>
          </div>
          <div className="text-xs text-text-secondary">
            {filledCount}/{sections.length} filled
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section, index) => (
          <SectionRow
            key={section.id}
            section={section}
            index={index}
            totalCount={sections.length}
            minSections={minSections}
            onLabelChange={(label) => updateLabel(section.id, label)}
            onItemChange={(item) => updateItem(section.id, item)}
            onRemove={() => removeSection(section.id)}
            onMoveUp={index > 0 ? () => moveSection(index, index - 1) : undefined}
            onMoveDown={index < sections.length - 1 ? () => moveSection(index, index + 1) : undefined}
          />
        ))}
      </div>

      {/* Add section button */}
      {sections.length < maxSections && (
        <button
          onClick={addSection}
          className="w-full py-3 border-2 border-dashed border-border hover:border-accent/50 rounded-xl text-text-secondary hover:text-accent transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Section ({sections.length}/{maxSections})
        </button>
      )}

      {/* Timeline preview */}
      {filledCount > 0 && (
        <div className="bg-surface-secondary rounded-lg p-4">
          <h4 className="text-sm font-medium text-text-primary mb-3">Sequence flow:</h4>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {sections.map((section, index) => (
              <div key={section.id} className="flex items-center gap-1 flex-shrink-0">
                <div className={`
                  px-3 py-2 rounded-lg text-xs font-medium
                  ${section.item ? 'bg-accent/20 text-accent' : 'bg-surface text-text-secondary'}
                `}>
                  {section.label}
                </div>
                {index < sections.length - 1 && (
                  <svg className="w-4 h-4 text-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Section row component
interface SectionRowProps {
  section: SequenceSection;
  index: number;
  totalCount: number;
  minSections: number;
  onLabelChange: (label: string) => void;
  onItemChange: (item: MediaItem | null) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function SectionRow({
  section,
  index,
  totalCount,
  minSections,
  onLabelChange,
  onItemChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SectionRowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const getMediaType = (file: File): ReelMediaType => {
    return file.type.startsWith('video/') ? 'video' : 'image';
  };

  const createThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.src = URL.createObjectURL(file);
        video.onloadeddata = () => { video.currentTime = 0.1; };
        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d')?.drawImage(video, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
          URL.revokeObjectURL(video.src);
        };
        video.onerror = () => { resolve(''); URL.revokeObjectURL(video.src); };
      }
    });
  };

  const handleFile = useCallback(async (file: File) => {
    const type = getMediaType(file);
    const thumbnail = await createThumbnail(file);

    onItemChange({
      id: generateId(),
      file,
      type,
      thumbnailUrl: thumbnail,
      motionEffect: type === 'image' ? 'ken_burns' : undefined,
      status: 'ready',
    });
  }, [onItemChange]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const canRemove = totalCount > minSections;

  return (
    <div className="bg-surface-secondary rounded-xl overflow-hidden group">
      <div className="flex items-stretch">
        {/* Order & controls */}
        <div className="flex-shrink-0 w-14 bg-surface flex flex-col items-center justify-center border-r border-border">
          <div className="text-lg font-bold text-text-secondary">{index + 1}</div>
          <div className="flex flex-col gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onMoveUp && (
              <button onClick={onMoveUp} className="p-0.5 text-text-secondary hover:text-text-primary">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            )}
            {onMoveDown && (
              <button onClick={onMoveDown} className="p-0.5 text-text-secondary hover:text-text-primary">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Label */}
        <div className="w-32 p-3 border-r border-border flex flex-col justify-center">
          {isEditingLabel ? (
            <input
              type="text"
              value={section.label}
              onChange={(e) => onLabelChange(e.target.value)}
              onBlur={() => setIsEditingLabel(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingLabel(false)}
              autoFocus
              className="bg-transparent border-b border-accent text-text-primary text-sm focus:outline-none"
            />
          ) : (
            <button
              onClick={() => setIsEditingLabel(true)}
              className="text-left text-sm font-medium text-text-primary hover:text-accent transition-colors"
            >
              {section.label}
              <span className="text-text-secondary/50 ml-1">✏️</span>
            </button>
          )}
          <span className="text-xs text-text-secondary mt-0.5">~3s each</span>
        </div>

        {/* Upload zone */}
        <div className="flex-1 p-3">
          {section.item ? (
            <div className="relative aspect-video rounded-lg overflow-hidden">
              {section.item.thumbnailUrl ? (
                <img src={section.item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-surface flex items-center justify-center text-2xl">
                  {section.item.type === 'video' ? '🎬' : '🖼'}
                </div>
              )}

              {/* Type badge */}
              <div className={`absolute top-1 right-1 ${section.item.type === 'video' ? 'bg-blue-500' : 'bg-green-500'} text-white text-[10px] px-1.5 py-0.5 rounded`}>
                {section.item.type === 'video' ? 'VID' : 'IMG'}
              </div>

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded backdrop-blur-sm"
                >
                  Replace
                </button>
                <button
                  onClick={() => onItemChange(null)}
                  className="bg-red-500/80 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragEnter={handleDragEnter}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                aspect-video border-2 border-dashed rounded-lg
                flex items-center justify-center gap-2
                transition-all cursor-pointer
                ${isDragging
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-accent/50'
                }
              `}
            >
              <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm text-text-secondary">Add media</span>
            </div>
          )}
        </div>

        {/* Remove button */}
        {canRemove && (
          <button
            onClick={onRemove}
            className="w-10 flex items-center justify-center text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={[...ACCEPTED_VIDEO_TYPES, ...ACCEPTED_IMAGE_TYPES].join(',')}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="hidden"
      />
    </div>
  );
}
