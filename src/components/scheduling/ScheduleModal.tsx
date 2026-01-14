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
  Copy,
  ExternalLink,
  Video,
  Image,
  FileText,
  Check,
  Sparkles,
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
  onMarkPosted?: (id: string) => Promise<boolean | void>;
  onMarkSkipped?: (id: string) => Promise<boolean | void>;
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

// Platform URLs for "Open in Platform" functionality
const PLATFORM_URLS: Record<string, string> = {
  instagram: 'https://www.instagram.com/',
  linkedin: 'https://www.linkedin.com/feed/',
  twitter: 'https://twitter.com/compose/tweet',
  facebook: 'https://www.facebook.com/',
  tiktok: 'https://www.tiktok.com/upload',
  youtube: 'https://studio.youtube.com/',
};

/**
 * Content preview component for scheduled posts
 */
function ContentPreview({
  post,
  onCopy,
}: {
  post: ScheduledPost;
  onCopy: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const snapshot = post.contentSnapshot;

  const handleCopy = (text: string) => {
    onCopy(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openPlatform = (platform: string) => {
    const url = PLATFORM_URLS[platform];
    if (url) {
      window.open(url, '_blank');
    }
  };

  // No content snapshot - just show title
  if (!snapshot) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">{post.title || 'Scheduled Post'}</span>
        </div>
        <p className="text-xs text-gray-500">
          Content details not available. Open the content kit to access full content.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-lg border border-gray-200 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {snapshot.type === 'clips' && <Video className="w-4 h-4 text-purple-600" />}
          {snapshot.type === 'carousel' && <Image className="w-4 h-4 text-pink-600" />}
          {snapshot.type === 'written' && <FileText className="w-4 h-4 text-blue-600" />}
          <span className="text-sm font-medium text-gray-900">{post.title || 'Scheduled Post'}</span>
        </div>
        <span className="text-xs px-2 py-0.5 bg-white rounded-full text-gray-600 capitalize border">
          {snapshot.type}
        </span>
      </div>

      {/* Written Content */}
      {snapshot.type === 'written' && snapshot.text && (
        <div className="space-y-2">
          <div className="bg-white rounded-md p-3 border border-gray-100 max-h-32 overflow-y-auto">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{snapshot.text}</p>
          </div>
          <button
            onClick={() => handleCopy(snapshot.text!)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
            {copied ? 'Copied!' : 'Copy Content'}
          </button>
        </div>
      )}

      {/* Video Clip */}
      {snapshot.type === 'clips' && (
        <div className="space-y-2">
          {snapshot.thumbnailUrl && (
            <div className="relative aspect-video w-full max-w-[200px] rounded-md overflow-hidden bg-gray-900">
              <img src={snapshot.thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-gray-900 border-b-[6px] border-b-transparent ml-1" />
                </div>
              </div>
            </div>
          )}
          {snapshot.suggestedCaption && (
            <div className="bg-white rounded-md p-3 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Suggested Caption:</p>
              <p className="text-sm text-gray-700">{snapshot.suggestedCaption}</p>
            </div>
          )}
          <div className="flex gap-2">
            {snapshot.suggestedCaption && (
              <button
                onClick={() => handleCopy(snapshot.suggestedCaption!)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                {copied ? 'Copied!' : 'Copy Caption'}
              </button>
            )}
            {snapshot.videoUrl && (
              <a
                href={snapshot.videoUrl}
                download
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <Video className="w-4 h-4" />
                Download Video
              </a>
            )}
          </div>
        </div>
      )}

      {/* Carousel */}
      {snapshot.type === 'carousel' && snapshot.carouselSlides && (
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {snapshot.carouselSlides.slice(0, 5).map((slide) => (
              <div key={slide.slideNumber} className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-gray-200">
                <img src={slide.imageUrl} alt={`Slide ${slide.slideNumber}`} className="w-full h-full object-cover" />
              </div>
            ))}
            {snapshot.carouselSlides.length > 5 && (
              <div className="flex-shrink-0 w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                +{snapshot.carouselSlides.length - 5}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">{snapshot.carouselSlides.length} slides</p>
        </div>
      )}

      {/* Platform Quick Actions */}
      {post.platforms.length > 0 && (
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Auto-posting coming soon! For now, open your platform to post:
          </p>
          <div className="flex flex-wrap gap-2">
            {post.platforms.map((platform) => (
              <button
                key={platform}
                onClick={() => openPlatform(platform)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors capitalize"
              >
                <ExternalLink className="w-3 h-3" />
                Open {platform}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
            {isEditMode && editingPost && (
              <ContentPreview
                post={editingPost}
                onCopy={(text) => {
                  navigator.clipboard.writeText(text);
                }}
              />
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
                Content Category
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
