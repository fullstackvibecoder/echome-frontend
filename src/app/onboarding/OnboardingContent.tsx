'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Youtube,
  Check,
  Loader2,
  X,
  Instagram,
  Globe,
  Mic,
  Camera,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { UploadZone } from '@/components/upload-zone';
import { VoiceRecorder } from '@/components/voice-recorder';
import { MboxProgressUI } from '@/components/mbox-progress-ui';
import { isMboxFile } from '@/lib/file-utils';
import { parseMboxFile } from '@/lib/mbox-parser';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContentStatus = 'processing' | 'completed' | 'error';
type ImportPlatform = 'youtube' | 'instagram' | 'blog';
type ImportStatus = 'idle' | 'importing' | 'done' | 'error';
type Tab = 'import' | 'paste' | 'upload' | 'voice';

interface ContentItem {
  id: string;
  title: string;
  type: 'paste' | 'file' | 'youtube' | 'instagram' | 'blog' | 'voice';
  status: ContentStatus;
  wordCount?: number;
  error?: string;
}

interface ImportState {
  status: ImportStatus;
  url: string;
  message?: string;
  jobId?: string;
}

interface ProfileState {
  displayName: string;
  twitterHandle: string;
  instagramHandle: string;
  profileImageUrl: string | null;
}

const MIN_CONTENT_ITEMS = 3;

// ---------------------------------------------------------------------------
// Voice Strength Ring SVG (compact)
// ---------------------------------------------------------------------------

function VoiceRing({
  progress,
  isReady,
  size = 48,
}: {
  progress: number;
  isReady: boolean;
  size?: number;
}) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <div className={`relative inline-flex ${isReady ? 'animate-voice-burst' : ''}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--accent-purple, #B794F6)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {isReady ? (
          <Check className="w-4 h-4 text-primary" />
        ) : (
          <span className="text-[10px] font-bold text-foreground">
            {Math.round(progress * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function OnboardingContent() {
  const router = useRouter();
  const { kbs, loading: kbLoading, contentItems: existingContent } = useKnowledgeBase();

  // Profile
  const [profile, setProfile] = useState<ProfileState>({
    displayName: '',
    twitterHandle: '',
    instagramHandle: '',
    profileImageUrl: null,
  });
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Content
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('paste');

  // Mbox
  const [mboxUploading, setMboxUploading] = useState(false);
  const [mboxProgress, setMboxProgress] = useState(0);
  const [mboxStatus, setMboxStatus] = useState<string>('');

  // Paste
  const [pasteText, setPasteText] = useState('');

  // Imports
  const [imports, setImports] = useState<Record<ImportPlatform, ImportState>>({
    youtube: { status: 'idle', url: '' },
    instagram: { status: 'idle', url: '' },
    blog: { status: 'idle', url: '' },
  });

  // KB
  const defaultKbId = kbs?.[0]?.id;

  // Derived
  const totalCompleted =
    contentItems.filter((i) => i.status === 'completed').length +
    (existingContent?.filter((i) => i.status === 'completed').length ?? 0);
  const ringProgress = Math.min(totalCompleted / MIN_CONTENT_ITEMS, 1);
  const isReady = totalCompleted >= MIN_CONTENT_ITEMS;

  // Redirect if already onboarded
  useEffect(() => {
    if (
      !kbLoading &&
      existingContent &&
      existingContent.filter((i) => i.status === 'completed').length >= MIN_CONTENT_ITEMS
    ) {
      router.replace('/app');
    }
  }, [kbLoading, existingContent, router]);

  // Load profile
  useEffect(() => {
    (async () => {
      try {
        const res = await api.auth.getProfile();
        if (res.success && res.data) {
          setProfile({
            displayName: res.data.display_name || res.data.full_name || '',
            twitterHandle: res.data.twitter_handle || '',
            instagramHandle: res.data.instagram_handle || '',
            profileImageUrl: res.data.profile_image_url || null,
          });
          if (res.data.display_name || res.data.twitter_handle || res.data.instagram_handle) {
            setProfileSaved(true);
          }
        }
      } catch {
        // fine
      }
    })();
  }, []);

  // --- Handlers ---

  const updateProfileField = (field: keyof ProfileState, value: string) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setProfileDirty(true);
    setProfileSaved(false);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      await api.auth.updateProfile({
        display_name: profile.displayName || undefined,
        twitter_handle: profile.twitterHandle || null,
        instagram_handle: profile.instagramHandle || null,
      });
      setProfileSaved(true);
      setProfileDirty(false);
    } catch {
      // non-blocking
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.auth.uploadProfileImage(file);
      if (res.success && res.data) {
        setProfile((p) => ({ ...p, profileImageUrl: res.data!.profile_image_url }));
      }
    } catch {
      // silently fail
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim() || pasteText.length < 50) return;
    setIsSubmitting(true);
    const tempId = `paste-${Date.now()}`;
    const wordCount = pasteText.split(/\s+/).length;

    setContentItems((prev) => [
      ...prev,
      { id: tempId, title: 'Writing sample', type: 'paste', status: 'processing', wordCount },
    ]);

    try {
      const result = await api.kbContent.paste({
        text: pasteText,
        title: 'Writing sample',
        sourceType: 'writing_sample',
        knowledgeBaseId: defaultKbId,
      });
      setContentItems((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? { ...item, id: result.contentId || tempId, status: 'completed' as ContentStatus }
            : item
        )
      );
      setPasteText('');
    } catch {
      setContentItems((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? { ...item, status: 'error' as ContentStatus, error: 'Failed to save' }
            : item
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (platform: ImportPlatform) => {
    const importState = imports[platform];
    if (!importState.url.trim()) return;

    setImports((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], status: 'importing' as ImportStatus },
    }));

    const tempId = `${platform}-${Date.now()}`;
    setContentItems((prev) => [
      ...prev,
      { id: tempId, title: `${platform} import`, type: platform, status: 'processing' },
    ]);

    try {
      const result = await api.kbContent.startSocialImport({
        platform,
        url: importState.url,
        knowledgeBaseId: defaultKbId,
        useForVoiceMatching: true,
      });

      setImports((prev) => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          status: 'done' as ImportStatus,
          jobId: result.jobId,
          message: result.message || 'Import started',
        },
      }));

      setContentItems((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? { ...item, id: result.jobId || tempId, status: 'completed' as ContentStatus }
            : item
        )
      );
    } catch {
      setImports((prev) => ({
        ...prev,
        [platform]: { ...prev[platform], status: 'error' as ImportStatus, message: 'Import failed' },
      }));
      setContentItems((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? { ...item, status: 'error' as ContentStatus, error: 'Import failed' }
            : item
        )
      );
    }
  };

  const processMboxFile = async (file: File) => {
    setMboxUploading(true);
    setMboxProgress(0);
    setMboxStatus('Reading file...');

    const tempId = `mbox-${Date.now()}-${file.name}`;
    setContentItems((prev) => [
      ...prev,
      { id: tempId, title: file.name, type: 'file', status: 'processing' },
    ]);

    try {
      const parseResult = await parseMboxFile(file, {
        maxEmails: 100,
        minContentLength: 50,
        onProgress: ({ percent, emailsFound, status }) => {
          setMboxProgress(Math.round(percent * 0.7));
          setMboxStatus(status || `Found ${emailsFound} emails...`);
        },
      });

      if (parseResult.emails.length === 0) {
        setContentItems((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? { ...item, status: 'error' as ContentStatus, error: 'No emails found — use your "Sent" folder' }
              : item
          )
        );
        return;
      }

      setMboxProgress(70);
      setMboxStatus(`Uploading ${parseResult.emails.length} emails...`);

      const result = await api.kbContent.ingestParsedEmails({
        emails: parseResult.emails,
        knowledgeBaseId: defaultKbId,
        fileName: file.name,
        parseStats: {
          totalEmailsFound: parseResult.totalEmailsFound,
          emailsParsed: parseResult.emailsParsed,
          emailsFiltered: parseResult.emailsFiltered,
          parseErrors: parseResult.parseErrors,
        },
        onBatchProgress: (batchNum, totalBatches) => {
          setMboxProgress(70 + Math.round((batchNum / totalBatches) * 30));
          setMboxStatus(`Uploading batch ${batchNum}/${totalBatches}...`);
        },
      });

      setMboxProgress(100);
      setContentItems((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? { ...item, title: `${file.name} (${result.emailsIngested} emails)`, status: 'completed' as ContentStatus }
            : item
        )
      );
    } catch (err) {
      setContentItems((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? { ...item, status: 'error' as ContentStatus, error: err instanceof Error ? err.message : 'Import failed' }
            : item
        )
      );
    } finally {
      setMboxUploading(false);
      setMboxStatus('');
    }
  };

  const handleFilesAdded = async (files: File[]) => {
    if (!defaultKbId) return;
    const mboxFiles = files.filter(isMboxFile);
    const otherFiles = files.filter((f) => !isMboxFile(f));

    for (const file of mboxFiles) {
      await processMboxFile(file);
    }

    for (const file of otherFiles) {
      const tempId = `file-${Date.now()}-${file.name}`;
      setContentItems((prev) => [
        ...prev,
        { id: tempId, title: file.name, type: 'file', status: 'processing' },
      ]);
      try {
        const result = await api.files.upload(defaultKbId, file);
        setContentItems((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? { ...item, id: result.data?.file?.id || tempId, status: 'completed' as ContentStatus }
              : item
          )
        );
      } catch {
        setContentItems((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? { ...item, status: 'error' as ContentStatus, error: 'Upload failed' }
              : item
          )
        );
      }
    }
  };

  const handleVoiceSaved = (result: {
    contentId: string;
    transcription: string;
    chunksCreated: number;
  }) => {
    setContentItems((prev) => [
      ...prev,
      { id: result.contentId, title: 'Voice recording', type: 'voice', status: 'completed' },
    ]);
  };

  const handleSkip = () => router.push('/app');
  const handleStartCreating = () => router.push('/app');

  // --- Loading ---
  if (kbLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- Render ---
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'paste', label: 'Paste Text', icon: <Sparkles className="w-4 h-4" /> },
    { key: 'import', label: 'Import', icon: <Globe className="w-4 h-4" /> },
    { key: 'upload', label: 'Upload', icon: <Upload className="w-4 h-4" /> },
    { key: 'voice', label: 'Record', icon: <Mic className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-8 md:py-12">
      {/* Backdrop gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-background via-background to-muted/30 -z-10" />

      {/* ========== DIALOG CONTAINER ========== */}
      <div className="w-full max-w-2xl animate-fade-in">
        {/* --- Header bar --- */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-lg font-bold text-primary">EchoMe</span>
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>

        {/* --- Hero (compact) --- */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Teach EchoMe Your{' '}
            <span className="bg-gradient-to-r from-primary via-[#B794F6] to-[#FF6B9D] bg-clip-text text-transparent animate-gradient-x bg-[length:200%_200%]">
              Voice
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Add at least {MIN_CONTENT_ITEMS} writing samples so content sounds like you, not a robot.
          </p>
        </div>

        {/* --- Progress bar --- */}
        <div className="flex items-center gap-3 mb-8 bg-card border border-border rounded-xl px-4 py-3">
          <VoiceRing progress={ringProgress} isReady={isReady} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">
                {isReady
                  ? 'Voice ready!'
                  : `${totalCompleted} of ${MIN_CONTENT_ITEMS} samples`}
              </span>
              {isReady && (
                <button
                  onClick={handleStartCreating}
                  className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  Start Creating <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isReady ? 'bg-green-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.max(ringProgress * 100, 2)}%` }}
              />
            </div>
          </div>
        </div>

        {/* --- Celebration banner --- */}
        {isReady && (
          <div className="mb-6 bg-primary/10 border border-primary/20 rounded-xl p-4 text-center animate-fade-in">
            <p className="font-semibold text-primary mb-2">Your voice is ready!</p>
            <button
              onClick={handleStartCreating}
              className="relative overflow-hidden px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors animate-shimmer-sweep"
            >
              Start Creating <ArrowRight className="inline ml-1 w-4 h-4" />
            </button>
            <p className="text-xs text-muted-foreground mt-2">
              Or keep adding for even better results
            </p>
          </div>
        )}

        {/* ========== PROFILE CARD ========== */}
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold">Your Profile</h2>
            <span className="text-xs text-muted-foreground">- appears on carousel slides</span>
          </div>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <label className="shrink-0 cursor-pointer group">
              <div className="w-14 h-14 rounded-full bg-muted border-2 border-border group-hover:border-primary transition-colors overflow-hidden flex items-center justify-center">
                {profile.profileImageUrl ? (
                  <img
                    src={profile.profileImageUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">
                    {profile.displayName?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <span className="block text-[10px] text-center text-muted-foreground mt-0.5 group-hover:text-primary transition-colors">
                <Camera className="inline w-2.5 h-2.5" /> Photo
              </span>
            </label>

            {/* Fields */}
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => updateProfileField('displayName', e.target.value)}
                placeholder="Display name"
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    value={profile.twitterHandle}
                    onChange={(e) => updateProfileField('twitterHandle', e.target.value)}
                    placeholder="twitter"
                    className="w-full pl-6 pr-2 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    value={profile.instagramHandle}
                    onChange={(e) => updateProfileField('instagramHandle', e.target.value)}
                    placeholder="instagram"
                    className="w-full pl-6 pr-2 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>
              {profileDirty && (
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                >
                  {profileSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  Save
                </button>
              )}
              {!profileDirty && profileSaved && (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ========== ADD CONTENT CARD ========== */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
          <div className="px-4 pt-4 pb-0">
            <h2 className="text-sm font-semibold mb-3">Train Your Voice</h2>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border px-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4">
            {/* Paste tab */}
            {activeTab === 'paste' && (
              <div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste a blog post, email, LinkedIn post, or anything you've written..."
                  rows={4}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                />
                <div className="flex items-center justify-between mt-2">
                  <span
                    className={`text-xs ${
                      pasteText.length > 0 && pasteText.length < 50
                        ? 'text-amber-500'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {pasteText.length > 0 && pasteText.length < 50
                      ? `${50 - pasteText.length} more characters needed`
                      : pasteText.length > 0
                      ? `${pasteText.length.toLocaleString()} chars`
                      : 'Min 50 characters'}
                  </span>
                  <button
                    onClick={handlePasteSubmit}
                    disabled={pasteText.length < 50 || isSubmitting}
                    className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Add to My Voice
                  </button>
                </div>
              </div>
            )}

            {/* Import tab */}
            {activeTab === 'import' && (
              <div className="space-y-3">
                <ImportRow
                  platform="youtube"
                  label="YouTube"
                  icon={<Youtube className="w-4 h-4 text-red-500" />}
                  placeholder="youtube.com/c/yourchannel"
                  state={imports.youtube}
                  onUrlChange={(url) =>
                    setImports((p) => ({ ...p, youtube: { ...p.youtube, url } }))
                  }
                  onImport={() => handleImport('youtube')}
                />
                <ImportRow
                  platform="instagram"
                  label="Instagram"
                  icon={<Instagram className="w-4 h-4 text-pink-500" />}
                  placeholder="instagram.com/yourprofile"
                  state={imports.instagram}
                  onUrlChange={(url) =>
                    setImports((p) => ({ ...p, instagram: { ...p.instagram, url } }))
                  }
                  onImport={() => handleImport('instagram')}
                />
                <ImportRow
                  platform="blog"
                  label="Blog"
                  icon={<Globe className="w-4 h-4 text-primary" />}
                  placeholder="yourblog.com"
                  state={imports.blog}
                  onUrlChange={(url) =>
                    setImports((p) => ({ ...p, blog: { ...p.blog, url } }))
                  }
                  onImport={() => handleImport('blog')}
                />
                <p className="text-xs text-muted-foreground pt-1">
                  Imports run in the background. You can continue while they process.
                </p>
              </div>
            )}

            {/* Upload tab */}
            {activeTab === 'upload' && (
              <>
                {mboxUploading && <MboxProgressUI progress={mboxProgress} status={mboxStatus} />}
                {!mboxUploading && (
                  <UploadZone onFilesAdded={handleFilesAdded} disabled={isSubmitting} />
                )}
              </>
            )}

            {/* Voice tab */}
            {activeTab === 'voice' && (
              <VoiceRecorder onSaved={handleVoiceSaved} knowledgeBaseId={defaultKbId} />
            )}
          </div>
        </div>

        {/* ========== CONTENT LIST ========== */}
        {contentItems.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Added ({contentItems.length})
            </h3>
            <div className="space-y-1.5">
              {contentItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 py-1.5 px-2.5 bg-muted/30 rounded-lg"
                >
                  {item.status === 'processing' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                  ) : item.status === 'completed' ? (
                    <div className="w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <Check className="w-2 h-2 text-white" />
                    </div>
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-destructive flex items-center justify-center shrink-0">
                      <X className="w-2 h-2 text-white" />
                    </div>
                  )}
                  <span className="text-sm truncate flex-1">{item.title}</span>
                  {item.error && (
                    <span className="text-xs text-destructive shrink-0">{item.error}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground capitalize shrink-0">
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== BOTTOM CTA ========== */}
        <div className="flex items-center justify-between py-4">
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip to dashboard
          </button>
          {isReady && (
            <button
              onClick={handleStartCreating}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            >
              Start Creating <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {!isReady && (
            <span className="text-xs text-muted-foreground">
              {MIN_CONTENT_ITEMS - totalCompleted} more sample
              {MIN_CONTENT_ITEMS - totalCompleted !== 1 ? 's' : ''} needed
            </span>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground pb-6">
          Without voice training, content will sound generic
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import Row Sub-component
// ---------------------------------------------------------------------------

function ImportRow({
  platform,
  label,
  icon,
  placeholder,
  state,
  onUrlChange,
  onImport,
}: {
  platform: ImportPlatform;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  state: ImportState;
  onUrlChange: (url: string) => void;
  onImport: () => void;
}) {
  if (state.status === 'done') {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-green-500/10 border border-green-500/20 rounded-lg">
        <Check className="w-4 h-4 text-green-500 shrink-0" />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {state.message || 'Import started'}
        </span>
      </div>
    );
  }

  if (state.status === 'importing') {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-muted/30 rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground ml-auto">Importing...</span>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-destructive/10 border border-destructive/20 rounded-lg">
        <X className="w-4 h-4 text-destructive shrink-0" />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-destructive ml-auto">
          {state.message || 'Import failed'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="shrink-0">{icon}</div>
      <input
        type="text"
        value={state.url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        onClick={onImport}
        disabled={!state.url.trim()}
        className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
      >
        Import
      </button>
    </div>
  );
}
