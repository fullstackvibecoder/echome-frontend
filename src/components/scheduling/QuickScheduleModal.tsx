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
  Youtube,
  Mail,
  FileText,
  GraduationCap,
  User,
  AlertCircle,
  Star,
  CalendarPlus,
  Music2,
} from 'lucide-react';
import { ContentCategory, CONTENT_CATEGORY_CONFIG } from '@/types';
import { useSubscription } from '@/hooks/useSubscription';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface QuickScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (data: {
    scheduledFor: string;
    platforms: string[];
    contentCategory?: ContentCategory;
    notes?: string;
  }) => Promise<void>;
  contentKitId: string;
  contentTitle: string;
  /** Single platform to pre-select */
  defaultPlatform?: string;
  /** Multiple platforms to pre-select (takes precedence over defaultPlatform) */
  defaultPlatforms?: string[];
  /** Connected social accounts for auto-posting */
  connectedAccounts?: Array<{ platform: string; id: string }>;
  /** The text content for auto-posting (e.g., Instagram caption) */
  autoPostText?: string;
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'tiktok', label: 'TikTok', icon: Music2 },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'twitter', label: 'Twitter/X', icon: Twitter },
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'blog', label: 'Blog', icon: FileText },
];

const CATEGORY_ICONS: Record<ContentCategory, typeof GraduationCap> = {
  authority: GraduationCap,
  personal_story: User,
  pain_problem: AlertCircle,
  testimonial: Star,
};

const TIME_PRESETS = [
  { label: 'Morning', time: '08:30', display: '8:30 AM' },
  { label: 'Lunch', time: '12:30', display: '12:30 PM' },
  { label: 'Evening', time: '17:30', display: '5:30 PM' },
];

/**
 * Simplified modal for quickly scheduling content from within a content kit
 */
export function QuickScheduleModal({
  isOpen,
  onClose,
  onSchedule,
  contentKitId,
  contentTitle,
  defaultPlatform,
  defaultPlatforms,
  connectedAccounts = [],
  autoPostText,
}: QuickScheduleModalProps) {
  const { hasTierAccess } = useSubscription();
  const canAutoPost = hasTierAccess('studio');

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('12:30');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | ''>('');
  const [notes, setNotes] = useState<string>('');
  const [autoPostEnabled, setAutoPostEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if Instagram auto-post is available
  const igConnected = connectedAccounts.some(a => a.platform === 'instagram');
  const igSelected = selectedPlatforms.includes('instagram');
  const showAutoPostToggle = canAutoPost && igConnected && igSelected;

  // Initialize with defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow.toISOString().split('T')[0]);
      setSelectedTime('12:30');
      // Use defaultPlatforms array if provided, otherwise fall back to single defaultPlatform
      if (defaultPlatforms && defaultPlatforms.length > 0) {
        setSelectedPlatforms(defaultPlatforms);
      } else if (defaultPlatform) {
        setSelectedPlatforms([defaultPlatform]);
      } else {
        setSelectedPlatforms(['linkedin']);
      }
      setSelectedCategory('');
      setNotes('');
      setError(null);
    }
  }, [isOpen, defaultPlatform, defaultPlatforms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime || selectedPlatforms.length === 0) {
      setError('Please select a date, time, and at least one platform');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const scheduledFor = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();

      // Schedule to calendar (all platforms)
      await onSchedule({
        scheduledFor,
        platforms: selectedPlatforms,
        contentCategory: selectedCategory || undefined,
        notes: notes || undefined,
      });

      // Auto-post to Instagram via Outstand (if enabled + connected + has text)
      if (showAutoPostToggle && autoPostEnabled && autoPostText) {
        try {
          await api.socialPosting.schedule({
            contentKitId,
            platform: 'instagram',
            text: autoPostText,
            scheduledAt: scheduledFor,
          });
          toast.success('Instagram auto-post scheduled!');
        } catch (err) {
          // Don't block the calendar schedule — just warn about auto-post failure
          console.error('Auto-post to Instagram failed:', err);
          toast.error('Calendar scheduled, but Instagram auto-post failed. You can retry from the calendar.');
        }
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule content');
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-primary rounded-2xl border border-border shadow-xl w-full max-w-md max-h-[95vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border sticky top-0 bg-bg-primary z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
              <CalendarPlus className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-text-primary">Add to Calendar</h2>
              <p className="text-sm text-text-secondary truncate max-w-[200px] sm:max-w-[250px]">{contentTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 sm:p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors touch-manipulation flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 sm:py-2.5 bg-background border-2 border-border rounded-lg text-foreground text-base sm:text-sm focus:outline-none focus:border-accent transition-colors"
              required
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              Time
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {TIME_PRESETS.map((preset) => (
                <button
                  key={preset.time}
                  type="button"
                  onClick={() => setSelectedTime(preset.time)}
                  className={`flex-1 min-w-[80px] py-2.5 sm:py-2 px-3 text-sm rounded-lg border transition-all touch-manipulation ${
                    selectedTime === preset.time
                      ? 'bg-accent text-white border-accent'
                      : 'bg-bg-secondary border-border text-text-secondary hover:border-accent/50'
                  }`}
                >
                  {preset.display}
                </button>
              ))}
            </div>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-4 py-3 sm:py-2.5 bg-background border-2 border-border rounded-lg text-foreground text-base sm:text-sm focus:outline-none focus:border-accent transition-colors"
              required
            />
          </div>

          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                const isSelected = selectedPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 sm:py-2 rounded-lg border text-sm transition-all touch-manipulation ${
                      isSelected
                        ? 'bg-accent text-white border-accent'
                        : 'bg-bg-secondary border-border text-text-secondary hover:border-accent/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto-post to Instagram toggle */}
          {showAutoPostToggle && (
            <div className="flex items-center justify-between p-3 bg-accent/5 border border-accent/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Auto-post to Instagram</p>
                  <p className="text-[11px] text-text-secondary">EchoMe will post this to @{connectedAccounts.find(a => a.platform === 'instagram')?.id || 'your account'} automatically</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoPostEnabled(!autoPostEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${autoPostEnabled ? 'bg-accent' : 'bg-border'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoPostEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          )}

          {/* Not connected hint for Instagram */}
          {canAutoPost && igSelected && !igConnected && (
            <div className="p-3 bg-bg-secondary rounded-lg">
              <p className="text-xs text-text-secondary">
                Connect Instagram in <a href="/app/settings?tab=connections" className="text-accent hover:underline">Settings → Connections</a> to auto-post.
              </p>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Content Category (optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(CONTENT_CATEGORY_CONFIG) as ContentCategory[]).map((category) => {
                const config = CONTENT_CATEGORY_CONFIG[category];
                const Icon = CATEGORY_ICONS[category];
                const isSelected = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(isSelected ? '' : category)}
                    className={`flex items-center gap-2 px-3 py-2.5 sm:py-2 rounded-lg border text-sm transition-all touch-manipulation ${
                      isSelected
                        ? 'bg-accent/10 text-accent border-accent'
                        : 'bg-bg-secondary border-border text-text-secondary hover:border-accent/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this post..."
              rows={2}
              maxLength={500}
              className="w-full px-4 py-3 sm:py-2.5 bg-background border-2 border-border rounded-lg text-foreground text-base sm:text-sm placeholder:text-text-secondary focus:outline-none focus:border-accent transition-colors resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-bg-primary pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 sm:py-2.5 px-4 bg-bg-secondary border border-border text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedPlatforms.length === 0}
              className="flex-1 py-3 sm:py-2.5 px-4 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarPlus className="w-4 h-4" />
                  Schedule
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
