'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  GraduationCap,
  User,
  AlertCircle,
  Star,
} from 'lucide-react';
import {
  ScheduledPost,
  ContentCategory,
  UnscheduledContent,
  CONTENT_CATEGORY_CONFIG,
} from '@/types';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    contentKitId: string;
    scheduledFor: string;
    platforms: string[];
    contentCategory?: ContentCategory;
    notes?: string;
  }) => Promise<void>;
  onUpdate?: (id: string, data: {
    scheduledFor?: string;
    platforms?: string[];
    contentCategory?: ContentCategory;
    notes?: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onMarkPosted?: (id: string) => Promise<void>;
  onMarkSkipped?: (id: string) => Promise<void>;
  unscheduledContent: UnscheduledContent[];
  editingPost?: ScheduledPost | null;
  defaultDate?: Date;
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'twitter', label: 'Twitter/X', icon: Twitter },
  { id: 'facebook', label: 'Facebook', icon: Facebook },
];

const CATEGORY_ICONS: Record<ContentCategory, typeof GraduationCap> = {
  authority: GraduationCap,
  personal_story: User,
  pain_problem: AlertCircle,
  testimonial: Star,
};

const TIME_PRESETS = [
  { label: 'Morning (8:30 AM)', hour: 8, minute: 30 },
  { label: 'Lunch (12:30 PM)', hour: 12, minute: 30 },
  { label: 'Evening (5:30 PM)', hour: 17, minute: 30 },
];

/**
 * Modal for scheduling content
 */
export function ScheduleModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  onMarkPosted,
  onMarkSkipped,
  unscheduledContent,
  editingPost,
  defaultDate,
}: ScheduleModalProps) {
  const [selectedContent, setSelectedContent] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | ''>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens/closes or editing post changes
  useEffect(() => {
    if (isOpen) {
      if (editingPost) {
        // Edit mode
        setSelectedContent(editingPost.contentKitId || '');
        const scheduledDate = new Date(editingPost.scheduledFor);
        setSelectedDate(scheduledDate.toISOString().split('T')[0]);
        setSelectedTime(
          `${String(scheduledDate.getHours()).padStart(2, '0')}:${String(
            scheduledDate.getMinutes()
          ).padStart(2, '0')}`
        );
        setSelectedPlatforms(editingPost.platforms);
        setSelectedCategory(editingPost.contentCategory || '');
        setNotes(editingPost.notes || '');
      } else {
        // Create mode
        setSelectedContent('');
        if (defaultDate) {
          setSelectedDate(defaultDate.toISOString().split('T')[0]);
        } else {
          setSelectedDate(new Date().toISOString().split('T')[0]);
        }
        setSelectedTime('08:30');
        setSelectedPlatforms(['instagram', 'linkedin']);
        setSelectedCategory('');
        setNotes('');
      }
    }
  }, [isOpen, editingPost, defaultDate]);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleTimePreset = (hour: number, minute: number) => {
    setSelectedTime(
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    );
  };

  const handleSave = async () => {
    if (!selectedContent && !editingPost) return;
    if (!selectedDate || !selectedTime) return;
    if (selectedPlatforms.length === 0) return;

    setLoading(true);

    try {
      const scheduledFor = new Date(`${selectedDate}T${selectedTime}`).toISOString();

      if (editingPost && onUpdate) {
        await onUpdate(editingPost.id, {
          scheduledFor,
          platforms: selectedPlatforms,
          contentCategory: selectedCategory || undefined,
          notes: notes || undefined,
        });
      } else {
        await onSave({
          contentKitId: selectedContent,
          scheduledFor,
          platforms: selectedPlatforms,
          contentCategory: selectedCategory || undefined,
          notes: notes || undefined,
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingPost || !onDelete) return;
    if (!confirm('Are you sure you want to delete this scheduled post?')) return;

    setLoading(true);
    try {
      await onDelete(editingPost.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isEditMode = !!editingPost;
  const canSave =
    (selectedContent || isEditMode) &&
    selectedDate &&
    selectedTime &&
    selectedPlatforms.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditMode ? 'Edit Scheduled Post' : 'Schedule Content'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-5">
            {/* Content Selection (only for new) */}
            {!isEditMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Content
                </label>
                <select
                  value={selectedContent}
                  onChange={e => setSelectedContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose content to schedule...</option>
                  {unscheduledContent.map(content => (
                    <option key={content.id} value={content.id}>
                      {content.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Content Preview (edit mode) */}
            {isEditMode && editingPost?.contentKit && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-900">
                  {editingPost.contentKit.title}
                </div>
                {editingPost.contentKit.description && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {editingPost.contentKit.description}
                  </div>
                )}
              </div>
            )}

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Time
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={e => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Time Presets */}
            <div className="flex gap-2 flex-wrap">
              {TIME_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handleTimePreset(preset.hour, preset.minute)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-700"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Platforms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platforms
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(platform => {
                  const Icon = platform.icon;
                  const isSelected = selectedPlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400 text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{platform.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Category (TLL Methodology)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(CONTENT_CATEGORY_CONFIG) as ContentCategory[]).map(
                  category => {
                    const config = CONTENT_CATEGORY_CONFIG[category];
                    const Icon = CATEGORY_ICONS[category];
                    const isSelected = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        onClick={() =>
                          setSelectedCategory(isSelected ? '' : category)
                        }
                        className={`flex items-start gap-2 px-3 py-2 rounded-md border transition-all text-left ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {config.label.split('/')[0]}
                          </div>
                          <div className="text-xs text-gray-500">
                            {config.description.slice(0, 40)}...
                          </div>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any reminders or notes for this post..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div>
              {isEditMode && editingPost?.status === 'scheduled' && (
                <div className="flex gap-2">
                  {onMarkPosted && (
                    <button
                      onClick={() => onMarkPosted(editingPost.id).then(onClose)}
                      disabled={loading}
                      className="px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 rounded-md transition-colors"
                    >
                      Mark as Posted
                    </button>
                  )}
                  {onMarkSkipped && (
                    <button
                      onClick={() => onMarkSkipped(editingPost.id).then(onClose)}
                      disabled={loading}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      Skip
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave || loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? 'Saving...'
                  : isEditMode
                  ? 'Update Schedule'
                  : 'Schedule Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
