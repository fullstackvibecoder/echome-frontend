'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Youtube,
  Check,
  Loader2,
  X,
  ChevronDown,
  Instagram,
  Globe,
  Mic,
  Camera,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { UploadZone } from '@/components/upload-zone';
import { VoiceRecorder } from '@/components/voice-recorder';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContentStatus = 'processing' | 'completed' | 'error';
type ImportPlatform = 'youtube' | 'instagram' | 'blog';
type ImportStatus = 'idle' | 'importing' | 'done' | 'error';
type ExpandedCard = 'upload' | 'voice' | null;

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
// Voice Strength Ring SVG
// ---------------------------------------------------------------------------

function VoiceStrengthRing({
  progress,
  isReady,
  size = 200,
}: {
  progress: number;
  isReady: boolean;
  size?: number;
}) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <div className={`relative ${isReady ? 'animate-voice-burst' : ''}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
        />
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--accent-purple, #B794F6)" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isReady ? (
          <Check className="w-12 h-12 text-primary" />
        ) : (
          <span className="text-3xl font-bold text-foreground">
            {Math.round(progress * 100)}%
          </span>
        )}
        <span className="text-xs text-muted-foreground mt-1">
          {isReady ? 'Voice Ready' : 'Voice Strength'}
        </span>
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

  // Profile state
  const [profile, setProfile] = useState<ProfileState>({
    displayName: '',
    twitterHandle: '',
    instagramHandle: '',
    profileImageUrl: null,
  });
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Content state
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Paste state
  const [pasteText, setPasteText] = useState('');

  // Import states
  const [imports, setImports] = useState<Record<ImportPlatform, ImportState>>({
    youtube: { status: 'idle', url: '' },
    instagram: { status: 'idle', url: '' },
    blog: { status: 'idle', url: '' },
  });

  // Expanded card for upload/voice
  const [expandedCard, setExpandedCard] = useState<ExpandedCard>(null);

  // Animation state
  const [heroVisible, setHeroVisible] = useState(false);
  const [celebrationShown, setCelebrationShown] = useState(false);

  // Refs for scroll-into-view
  const identityRef = useRef<HTMLDivElement>(null);
  const connectRef = useRef<HTMLDivElement>(null);
  const samplesRef = useRef<HTMLDivElement>(null);

  // KB
  const defaultKbId = kbs?.[0]?.id;

  // Derived state
  const totalCompleted =
    contentItems.filter((i) => i.status === 'completed').length +
    (existingContent?.filter((i) => i.status === 'completed').length ?? 0);
  const ringProgress = Math.min(totalCompleted / MIN_CONTENT_ITEMS, 1);
  const isReady = totalCompleted >= MIN_CONTENT_ITEMS;

  // Hero entrance animation
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Celebration trigger
  useEffect(() => {
    if (isReady && !celebrationShown) {
      setCelebrationShown(true);
    }
  }, [isReady, celebrationShown]);

  // If user already has 3+ KB items, redirect to /app
  useEffect(() => {
    if (!kbLoading && existingContent && existingContent.filter((i) => i.status === 'completed').length >= MIN_CONTENT_ITEMS) {
      router.replace('/app');
    }
  }, [kbLoading, existingContent, router]);

  // Load existing profile
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
        // Profile not loaded — that's fine, user can fill it in
      }
    })();
  }, []);

  // ------ Handlers ------

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
      // silently fail — non-blocking
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
      { id: tempId, title: `Writing sample`, type: 'paste', status: 'processing', wordCount },
    ]);

    try {
      const result = await api.kbContent.paste({
        text: pasteText,
        title: `Writing sample`,
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
          item.id === tempId ? { ...item, status: 'error' as ContentStatus, error: 'Failed to save' } : item
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
          item.id === tempId ? { ...item, status: 'error' as ContentStatus, error: 'Import failed' } : item
        )
      );
    }
  };

  const handleFilesAdded = async (files: File[]) => {
    if (!defaultKbId) return;

    for (const file of files) {
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
            item.id === tempId ? { ...item, status: 'error' as ContentStatus, error: 'Upload failed' } : item
          )
        );
      }
    }
    setExpandedCard(null);
  };

  const handleVoiceSaved = (result: { contentId: string; transcription: string; chunksCreated: number }) => {
    setContentItems((prev) => [
      ...prev,
      { id: result.contentId, title: 'Voice recording', type: 'voice', status: 'completed' },
    ]);
    setExpandedCard(null);
  };

  const handleSkip = () => router.push('/app');
  const handleStartCreating = () => router.push('/app');

  // ------ Loading ------

  if (kbLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ------ Render ------

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ========== STICKY HEADER ========== */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3">
          <span className="text-lg font-bold text-primary">EchoMe</span>
          <div className="flex items-center gap-4">
            {/* Mini ring in header */}
            <VoiceStrengthRing progress={ringProgress} isReady={isReady} size={36} />
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              I&apos;ll do this later
            </button>
          </div>
        </div>
      </header>

      {/* ========== SECTION 1: THE REVEAL ========== */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Dark gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#111118] to-background" />

        <div
          className={`relative z-10 flex flex-col items-center text-center transition-all duration-1000 ${
            heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Content That Sounds Like{' '}
            <span className="bg-gradient-to-r from-primary via-[#B794F6] to-[#FF6B9D] bg-clip-text text-transparent animate-gradient-x bg-[length:200%_200%]">
              You
            </span>
          </h1>

          <p
            className={`text-lg md:text-xl text-gray-400 max-w-xl mb-10 transition-all duration-1000 delay-500 ${
              heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            EchoMe learns your voice from content you&apos;ve already created.
          </p>

          {/* Voice Ring */}
          <div
            className={`transition-all duration-1000 delay-700 ${
              heroVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            <VoiceStrengthRing progress={ringProgress} isReady={isReady} size={200} />
          </div>

          {/* Celebration state */}
          {isReady && celebrationShown && (
            <div className="mt-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-white mb-3">Your Voice is Ready</h2>
              <button
                onClick={handleStartCreating}
                className="relative overflow-hidden px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors animate-shimmer-sweep"
              >
                Start Creating
                <ArrowRight className="inline ml-2 w-5 h-5" />
              </button>
              <p className="text-sm text-gray-500 mt-3">Or keep adding for even better results</p>
            </div>
          )}
        </div>

        {/* Scroll arrow */}
        {!isReady && (
          <div className="absolute bottom-8 z-10 animate-bounce-down">
            <ChevronDown className="w-8 h-8 text-gray-500" />
          </div>
        )}
      </section>

      {/* ========== SECTION 2: YOUR IDENTITY ========== */}
      <section ref={identityRef} className="py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="animate-on-scroll">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Your Identity</h2>
            <p className="text-muted-foreground mb-8">This appears on your carousel slides</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 animate-on-scroll" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <label className="shrink-0 cursor-pointer group">
                <div className="w-20 h-20 rounded-full bg-muted border-2 border-border group-hover:border-primary transition-colors overflow-hidden flex items-center justify-center">
                  {profile.profileImageUrl ? (
                    <img
                      src={profile.profileImageUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">
                      {profile.displayName?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <span className="block text-xs text-center text-muted-foreground mt-1 group-hover:text-primary transition-colors">
                  <Camera className="inline w-3 h-3 mr-0.5" />
                  Photo
                </span>
              </label>

              {/* Fields */}
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Display Name</label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => updateProfileField('displayName', e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">X / Twitter</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <input
                        type="text"
                        value={profile.twitterHandle}
                        onChange={(e) => updateProfileField('twitterHandle', e.target.value)}
                        placeholder="handle"
                        className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Instagram</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <input
                        type="text"
                        value={profile.instagramHandle}
                        onChange={(e) => updateProfileField('instagramHandle', e.target.value)}
                        placeholder="handle"
                        className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Save button — appears on change */}
                {profileDirty && (
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleSaveProfile}
                      disabled={profileSaving}
                      className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save
                    </button>
                    {profileSaved && (
                      <span className="text-sm text-green-500 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Saved
                      </span>
                    )}
                  </div>
                )}
                {!profileDirty && profileSaved && (
                  <span className="text-sm text-green-500 flex items-center gap-1 pt-1">
                    <Check className="w-3.5 h-3.5" /> Profile saved
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-center mt-6">
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip to dashboard
            </button>
            <p className="text-xs text-muted-foreground mt-1">
              Without voice training, content will sound generic
            </p>
          </div>
        </div>
      </section>

      {/* ========== SECTION 3: CONNECT YOUR CONTENT ========== */}
      <section ref={connectRef} className="py-20 px-6 bg-muted/20">
        <div className="max-w-3xl mx-auto">
          <div className="animate-on-scroll">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Connect Your Content</h2>
            <p className="text-muted-foreground mb-8">
              The easiest way to train your voice — import from platforms you already use
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* YouTube */}
            <ImportCard
              platform="youtube"
              label="YouTube Channel"
              icon={<Youtube className="w-6 h-6" />}
              iconColor="text-red-500"
              placeholder="youtube.com/c/yourchannel"
              helperText="Imports transcripts from your videos"
              state={imports.youtube}
              onUrlChange={(url) =>
                setImports((prev) => ({ ...prev, youtube: { ...prev.youtube, url } }))
              }
              onImport={() => handleImport('youtube')}
            />
            {/* Instagram */}
            <ImportCard
              platform="instagram"
              label="Instagram"
              icon={<Instagram className="w-6 h-6" />}
              iconColor="text-pink-500"
              placeholder="instagram.com/yourprofile"
              helperText="Imports your captions"
              state={imports.instagram}
              onUrlChange={(url) =>
                setImports((prev) => ({ ...prev, instagram: { ...prev.instagram, url } }))
              }
              onImport={() => handleImport('instagram')}
            />
            {/* Blog */}
            <ImportCard
              platform="blog"
              label="Blog"
              icon={<Globe className="w-6 h-6" />}
              iconColor="text-primary"
              placeholder="yourblog.com"
              helperText="Imports your posts"
              state={imports.blog}
              onUrlChange={(url) =>
                setImports((prev) => ({ ...prev, blog: { ...prev.blog, url } }))
              }
              onImport={() => handleImport('blog')}
            />
          </div>
        </div>
      </section>

      {/* ========== SECTION 4: ADD SAMPLES DIRECTLY ========== */}
      <section ref={samplesRef} className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="animate-on-scroll">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Add Samples Directly</h2>
            <p className="text-muted-foreground mb-8">
              Paste, upload, or record — anything you&apos;ve written or said
            </p>
          </div>

          {/* Paste textarea — always visible */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6 animate-on-scroll" style={{ animationDelay: '0.1s' }}>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste a blog post, email, LinkedIn post, or anything you've written..."
              rows={5}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
            />
            <div className="flex items-center justify-between mt-3">
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
                  ? `${pasteText.length.toLocaleString()} characters`
                  : ''}
              </span>
              <button
                onClick={handlePasteSubmit}
                disabled={pasteText.length < 50 || isSubmitting}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Add to My Voice
              </button>
            </div>
          </div>

          {/* Upload & Voice cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-on-scroll" style={{ animationDelay: '0.2s' }}>
            {/* Upload File Card */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedCard(expandedCard === 'upload' ? null : 'upload')}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Upload File</p>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, TXT documents</p>
                </div>
                <ChevronDown
                  className={`ml-auto w-4 h-4 text-muted-foreground transition-transform ${
                    expandedCard === 'upload' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  expandedCard === 'upload' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-4 pt-0">
                  <UploadZone onFilesAdded={handleFilesAdded} disabled={isSubmitting} />
                </div>
              </div>
            </div>

            {/* Record Voice Card */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedCard(expandedCard === 'voice' ? null : 'voice')}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Record Voice</p>
                  <p className="text-xs text-muted-foreground">Speak naturally for best results</p>
                </div>
                <ChevronDown
                  className={`ml-auto w-4 h-4 text-muted-foreground transition-transform ${
                    expandedCard === 'voice' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  expandedCard === 'voice' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-4 pt-0">
                  <VoiceRecorder
                    onSaved={handleVoiceSaved}
                    knowledgeBaseId={defaultKbId}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Content list */}
          {contentItems.length > 0 && (
            <div className="mt-8 bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-3">
                Added this session ({contentItems.length})
              </h3>
              <div className="space-y-2">
                {contentItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg"
                  >
                    {item.status === 'processing' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                    ) : item.status === 'completed' ? (
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-destructive flex items-center justify-center shrink-0">
                        <X className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.error && (
                        <p className="text-xs text-destructive">{item.error}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize shrink-0">{item.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========== BOTTOM CTA ========== */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-md mx-auto">
          {isReady ? (
            <div className="animate-fade-in">
              <VoiceStrengthRing progress={1} isReady size={120} />
              <h2 className="text-2xl font-bold mt-6 mb-4">Your Voice is Ready</h2>
              <button
                onClick={handleStartCreating}
                className="relative overflow-hidden w-full px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors animate-shimmer-sweep"
              >
                Start Creating
                <ArrowRight className="inline ml-2 w-5 h-5" />
              </button>
              <p className="text-sm text-muted-foreground mt-3">
                Or keep adding for even better results
              </p>
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground mb-4">
                Add {MIN_CONTENT_ITEMS - totalCompleted} more sample{MIN_CONTENT_ITEMS - totalCompleted !== 1 ? 's' : ''} for best results
              </p>
              <button
                onClick={handleSkip}
                className="px-6 py-3 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                Skip to dashboard
              </button>
              <p className="text-xs text-muted-foreground mt-2">
                Without voice training, content will sound generic
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import Card Sub-component
// ---------------------------------------------------------------------------

function ImportCard({
  platform,
  label,
  icon,
  iconColor,
  placeholder,
  helperText,
  state,
  onUrlChange,
  onImport,
}: {
  platform: ImportPlatform;
  label: string;
  icon: React.ReactNode;
  iconColor: string;
  placeholder: string;
  helperText: string;
  state: ImportState;
  onUrlChange: (url: string) => void;
  onImport: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden animate-on-scroll" style={{ animationDelay: `${['youtube', 'instagram', 'blog'].indexOf(platform) * 0.1}s` }}>
      <button
        onClick={() => state.status === 'idle' && setExpanded(!expanded)}
        disabled={state.status !== 'idle'}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors disabled:hover:bg-transparent"
      >
        <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${iconColor}`}>
          {state.status === 'importing' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : state.status === 'done' ? (
            <Check className="w-5 h-5 text-green-500" />
          ) : (
            icon
          )}
        </div>
        <div className="text-left flex-1">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">
            {state.status === 'importing'
              ? 'Importing...'
              : state.status === 'done'
              ? state.message || 'Import started'
              : state.status === 'error'
              ? state.message || 'Import failed'
              : helperText}
          </p>
        </div>
        {state.status === 'idle' && (
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Expanded URL input */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          expanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 flex gap-2">
          <input
            type="text"
            value={state.url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => {
              onImport();
              setExpanded(false);
            }}
            disabled={!state.url.trim()}
            className="px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
