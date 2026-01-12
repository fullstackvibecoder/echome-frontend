'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Youtube, Check, Loader2, X, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { UploadZone } from '@/components/upload-zone';

type InputMethod = 'paste' | 'upload' | 'youtube' | null;
type ContentStatus = 'processing' | 'completed' | 'error';

interface ContentItem {
  id: string;
  title: string;
  type: 'paste' | 'file' | 'youtube';
  status: ContentStatus;
  wordCount?: number;
  error?: string;
}

const MIN_CONTENT_ITEMS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const { kbs, loading: kbLoading, refresh } = useKnowledgeBase();

  const [activeMethod, setActiveMethod] = useState<InputMethod>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Paste state
  const [pasteText, setPasteText] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');

  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Get or create default KB
  const defaultKbId = kbs?.[0]?.id;

  // Refresh KB on mount to ensure we have latest content count
  useEffect(() => {
    refresh();
  }, []);

  const completedCount = contentItems.filter(item => item.status === 'completed').length;
  const progressPercent = Math.min((completedCount / MIN_CONTENT_ITEMS) * 100, 100);
  const hasMinimumContent = completedCount >= MIN_CONTENT_ITEMS;

  // Handle paste submission
  const handlePasteSubmit = async () => {
    if (!pasteText.trim() || pasteText.length < 50) return;

    setIsSubmitting(true);
    const tempId = `paste-${Date.now()}`;
    const title = pasteTitle.trim() || `Writing sample ${contentItems.length + 1}`;
    const wordCount = pasteText.split(/\s+/).length;

    // Add optimistic item
    setContentItems(prev => [...prev, {
      id: tempId,
      title,
      type: 'paste',
      status: 'processing',
      wordCount,
    }]);

    try {
      const result = await api.kbContent.paste({
        text: pasteText,
        title,
        sourceType: 'writing_sample',
        knowledgeBaseId: defaultKbId,
      });

      // Update to completed
      setContentItems(prev => prev.map(item =>
        item.id === tempId
          ? { ...item, id: result.contentId || tempId, status: 'completed' as ContentStatus }
          : item
      ));

      // Reset form
      setPasteText('');
      setPasteTitle('');
      setActiveMethod(null);
    } catch (error) {
      setContentItems(prev => prev.map(item =>
        item.id === tempId
          ? { ...item, status: 'error' as ContentStatus, error: 'Failed to save' }
          : item
      ));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle YouTube submission
  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim()) return;

    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeUrl)) {
      return;
    }

    setIsSubmitting(true);
    const tempId = `youtube-${Date.now()}`;

    // Add optimistic item
    setContentItems(prev => [...prev, {
      id: tempId,
      title: 'YouTube video',
      type: 'youtube',
      status: 'processing',
    }]);

    try {
      const result = await api.kbContent.startSocialImport({
        platform: 'youtube',
        url: youtubeUrl,
        knowledgeBaseId: defaultKbId,
        useForVoiceMatching: true,
      });

      // Update with job info - YouTube imports process async
      setContentItems(prev => prev.map(item =>
        item.id === tempId
          ? {
              ...item,
              id: result.jobId || tempId,
              title: 'YouTube transcript',
              status: 'completed' as ContentStatus
            }
          : item
      ));

      // Reset form
      setYoutubeUrl('');
      setActiveMethod(null);
    } catch (error) {
      setContentItems(prev => prev.map(item =>
        item.id === tempId
          ? { ...item, status: 'error' as ContentStatus, error: 'Failed to import' }
          : item
      ));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle file upload
  const handleFilesAdded = async (files: File[]) => {
    if (!defaultKbId) return;

    for (const file of files) {
      const tempId = `file-${Date.now()}-${file.name}`;

      // Add optimistic item
      setContentItems(prev => [...prev, {
        id: tempId,
        title: file.name,
        type: 'file',
        status: 'processing',
      }]);

      try {
        const result = await api.files.upload(defaultKbId, file);

        setContentItems(prev => prev.map(item =>
          item.id === tempId
            ? { ...item, id: result.data?.file?.id || tempId, status: 'completed' as ContentStatus }
            : item
        ));
      } catch (error) {
        setContentItems(prev => prev.map(item =>
          item.id === tempId
            ? { ...item, status: 'error' as ContentStatus, error: 'Upload failed' }
            : item
        ));
      }
    }

    setActiveMethod(null);
  };

  // Remove content item
  const handleRemoveItem = async (itemId: string) => {
    setContentItems(prev => prev.filter(item => item.id !== itemId));
    // Note: Could also call API to delete, but for onboarding we just remove from UI
  };

  // Continue to dashboard
  const handleContinue = () => {
    router.push('/app');
  };

  // Skip onboarding
  const handleSkip = () => {
    router.push('/app');
  };

  const getProgressMessage = () => {
    if (completedCount === 0) return 'Add content to train your voice';
    if (completedCount < MIN_CONTENT_ITEMS) return `Add ${MIN_CONTENT_ITEMS - completedCount} more for best results`;
    return 'Great! You have enough content to get started';
  };

  if (kbLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <h1 className="text-2xl font-bold text-primary">EchoMe</h1>
        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip to Dashboard
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Teach EchoMe Your Voice
          </h2>
          <p className="text-lg text-muted-foreground">
            Add content you&apos;ve created so we can match your unique style
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-card border rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              {completedCount} of {MIN_CONTENT_ITEMS} items
            </span>
            <span className="text-sm text-muted-foreground">
              {getProgressMessage()}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${hasMinimumContent ? 'bg-green-500' : 'bg-primary'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Input Methods */}
        {!activeMethod && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Paste Text */}
            <button
              onClick={() => setActiveMethod('paste')}
              className="flex flex-col items-center gap-3 p-6 bg-card border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Paste Text</p>
                <p className="text-sm text-muted-foreground">Blog posts, emails, social captions</p>
              </div>
            </button>

            {/* Upload Files */}
            <button
              onClick={() => setActiveMethod('upload')}
              className="flex flex-col items-center gap-3 p-6 bg-card border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Upload Files</p>
                <p className="text-sm text-muted-foreground">PDF, DOCX, TXT documents</p>
              </div>
            </button>

            {/* YouTube Link */}
            <button
              onClick={() => setActiveMethod('youtube')}
              className="flex flex-col items-center gap-3 p-6 bg-card border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                <Youtube className="w-6 h-6 text-red-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold">YouTube Link</p>
                <p className="text-sm text-muted-foreground">Extract transcript from video</p>
              </div>
            </button>
          </div>
        )}

        {/* Active Input Method */}
        {activeMethod === 'paste' && (
          <div className="bg-card border rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Paste Your Content
              </h3>
              <button
                onClick={() => setActiveMethod(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full px-4 py-2 mb-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your blog post, email, or any writing that represents your voice..."
              rows={6}
              className="w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />

            <div className="flex items-center justify-between mt-3">
              <span className={`text-sm ${pasteText.length < 50 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {pasteText.length < 50 ? `${50 - pasteText.length} more characters needed` : `${pasteText.length.toLocaleString()} characters`}
              </span>
              <button
                onClick={handlePasteSubmit}
                disabled={pasteText.length < 50 || isSubmitting}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Add Content
              </button>
            </div>
          </div>
        )}

        {activeMethod === 'upload' && (
          <div className="bg-card border rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Upload Files
              </h3>
              <button
                onClick={() => setActiveMethod(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <UploadZone onFilesAdded={handleFilesAdded} disabled={isSubmitting} />
          </div>
        )}

        {activeMethod === 'youtube' && (
          <div className="bg-card border rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-500" />
                Import YouTube Video
              </h3>
              <button
                onClick={() => setActiveMethod(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or channel URL"
              className="w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <p className="text-sm text-muted-foreground mt-2 mb-4">
              We&apos;ll extract the transcript to learn your speaking style
            </p>

            <button
              onClick={handleYoutubeSubmit}
              disabled={!youtubeUrl.trim() || isSubmitting}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Import Transcript
            </button>
          </div>
        )}

        {/* Content List */}
        {contentItems.length > 0 && (
          <div className="bg-card border rounded-xl p-5 mb-8">
            <h3 className="font-semibold mb-4">Your Content ({contentItems.length})</h3>
            <div className="space-y-3">
              {contentItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {item.status === 'processing' ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : item.status === 'completed' ? (
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.type === 'paste' && item.wordCount && `${item.wordCount} words`}
                        {item.type === 'file' && 'Document'}
                        {item.type === 'youtube' && 'YouTube transcript'}
                        {item.error && <span className="text-destructive"> - {item.error}</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleContinue}
            className={`w-full max-w-md px-6 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
              hasMinimumContent
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Continue to Dashboard
            <ChevronRight className="w-5 h-5" />
          </button>

          {!hasMinimumContent && (
            <p className="text-sm text-muted-foreground">
              You can continue anytime, but adding more content improves results
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
