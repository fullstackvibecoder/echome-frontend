'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, Check, Loader2, X, Mic, Camera, ArrowRight, Sparkles,
  Play, FileText, Mail, PenLine, Share2, Link, CheckCircle,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { UploadZone } from '@/components/upload-zone';
import { VoiceRecorder } from '@/components/voice-recorder';
import { MboxProgressUI } from '@/components/mbox-progress-ui';
import { isMboxFile } from '@/lib/file-utils';
import { parseMboxFile } from '@/lib/mbox-parser';
import { extractErrorMessage } from '@/lib/error-utils';

// ============================================
// TYPES & CONSTANTS
// ============================================

const MIN_CONTENT_ITEMS = 3;

type Step =
  | 'welcome'
  | 'profile'
  | 'youtube'
  | 'instagram'
  | 'blog'
  | 'paste'
  | 'voice'
  | 'upload'
  | 'email'
  | 'check'
  | 'done';

// The guided order Echo walks through
const IMPORT_STEPS: Step[] = ['youtube', 'instagram', 'blog', 'paste', 'voice'];

interface Message {
  id: string;
  role: 'echo' | 'user' | 'system';
  content: string;
}

let msgId = 0;
function nextId() { return `ob_${++msgId}_${Date.now()}`; }

// ============================================
// ECHO AVATAR
// ============================================

function EchoAvatar() {
  return (
    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0"
      style={{ boxShadow: '0 0 20px rgba(0, 212, 255, 0.15)' }}>
      <Sparkles className="w-5 h-5 text-white" />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function OnboardingContent() {
  const router = useRouter();
  const { kbs, loading: kbLoading, contentItems: existingContent, refresh } = useKnowledgeBase();

  const [step, setStep] = useState<Step>('welcome');
  const [messages, setMessages] = useState<Message[]>([]);
  const [completedItems, setCompletedItems] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Profile
  const [displayName, setDisplayName] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Import state
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasting, setPasting] = useState(false);

  // Modal state
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMboxModal, setShowMboxModal] = useState(false);

  // MBOX
  const [mboxUploading, setMboxUploading] = useState(false);
  const [mboxProgress, setMboxProgress] = useState(0);
  const [mboxStatus, setMboxStatus] = useState('');
  const mboxInputRef = useRef<HTMLInputElement>(null);

  // Skipped steps tracking
  const [skippedSteps, setSkippedSteps] = useState<Set<Step>>(new Set());

  const defaultKbId = kbs?.[0]?.id;

  // Count completed items
  const existingCompleted = existingContent?.filter(i => i.status === 'completed').length ?? 0;
  const totalCompleted = completedItems + existingCompleted;
  const isReady = totalCompleted >= MIN_CONTENT_ITEMS;

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [messages, step]);

  // Redirect if already onboarded
  useEffect(() => {
    if (!kbLoading && existingCompleted >= MIN_CONTENT_ITEMS) {
      const redirect = localStorage.getItem('postOnboardingRedirect');
      localStorage.removeItem('postOnboardingRedirect');
      router.replace(redirect && redirect.startsWith('/app') ? redirect : '/app');
    }
  }, [kbLoading, existingCompleted, router]);

  // Load profile with enhanced error handling
  useEffect(() => {
    (async () => {
      try {
        const res = await api.auth.getProfile().catch(error => {
          // Handle 404 errors for profile not found
          if (error.response?.status === 404) {
            console.warn('[Onboarding] User profile not found, will create during save');
            return { success: false, error: { code: 'PROFILE_NOT_FOUND' } };
          }
          if (error.response?.status === 401) {
            console.error('[Onboarding] Authentication error loading profile');
            return { success: false, error: { code: 'UNAUTHORIZED' } };
          }
          throw error;
        });

        if (res.success && res.data) {
          setDisplayName(res.data.display_name || res.data.full_name || '');
          setTwitterHandle(res.data.twitter_handle || '');
          setInstagramHandle(res.data.instagram_handle || '');
        } else if (res.error?.code === 'PROFILE_NOT_FOUND') {
          // Profile doesn't exist yet, that's okay for new users
          console.info('[Onboarding] New user, profile will be created');
        } else if (res.error?.code === 'UNAUTHORIZED') {
          // Authentication issue, but don't break onboarding
          console.warn('[Onboarding] Authentication error, user may need to log in again');
        }
      } catch (error: any) {
        console.error('[Onboarding] Profile loading error:', error);
        // Don't block onboarding for profile loading issues
      }
    })();
  }, []);

  // Seed welcome message
  useEffect(() => {
    if (messages.length === 0) {
      addEcho("I'm Echo. I learn how you write, speak, and think, then I use that to generate content in your actual voice. The more you feed me, the better the match gets. Let's set you up.");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Helpers ───
  const addEcho = (content: string) => {
    setMessages(prev => [...prev, { id: nextId(), role: 'echo', content }]);
  };

  const addUser = (content: string) => {
    setMessages(prev => [...prev, { id: nextId(), role: 'user', content }]);
  };

  const addSystem = (content: string) => {
    setMessages(prev => [...prev, { id: nextId(), role: 'system', content }]);
  };

  const getPostOnboardingPath = () => {
    const redirect = localStorage.getItem('postOnboardingRedirect');
    localStorage.removeItem('postOnboardingRedirect');
    return redirect && redirect.startsWith('/app') ? redirect : '/app';
  };

  const getNextImportStep = (currentStep: Step): Step => {
    const currentIdx = IMPORT_STEPS.indexOf(currentStep);
    // Find the next step that hasn't been skipped or completed
    for (let i = currentIdx + 1; i < IMPORT_STEPS.length; i++) {
      if (!skippedSteps.has(IMPORT_STEPS[i])) return IMPORT_STEPS[i];
    }
    return 'check';
  };

  const advanceToStep = (nextStep: Step) => {
    setImportUrl('');
    setStep(nextStep);

    switch (nextStep) {
      case 'youtube':
        addEcho("Do you have a YouTube channel or videos? Transcripts are great for capturing how you naturally speak.");
        break;
      case 'instagram':
        addEcho("How about Instagram? Your captions and posts show how you talk to your audience.");
        break;
      case 'blog':
        addEcho("Do you have a blog or Substack? Long-form writing is the best way for me to learn your depth.");
        break;
      case 'paste':
        addEcho("Would you like to paste some writing? An email, a post, a draft. Anything works.");
        break;
      case 'voice':
        addEcho("Want to record a quick voice note? Nothing captures tone like your actual voice.");
        break;
      case 'check':
        if (isReady || totalCompleted >= MIN_CONTENT_ITEMS) {
          addEcho(`Looking good. I have ${totalCompleted} sources to work with. Your voice profile is building. Ready to start creating?`);
          setStep('done');
        } else {
          const remaining = MIN_CONTENT_ITEMS - totalCompleted;
          addEcho(`I have ${totalCompleted} source${totalCompleted !== 1 ? 's' : ''} so far. I need ${remaining} more to get started. Want to add more?`);
          break;
        }
        break;
      case 'done':
        addEcho("You're all set. Let's go create something that sounds like you.");
        break;
    }
  };

  // ─── Step handlers ───

  const handleGetStarted = () => {
    addUser("Let's go");
    addEcho("First, what should I call you?");
    setStep('profile');
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) return;
    setProfileSaving(true);
    addUser(displayName.trim());

    try {
      const result = await api.auth.updateProfile({
        display_name: displayName.trim() || undefined,
        twitter_handle: twitterHandle.trim() || null,
        instagram_handle: instagramHandle.trim() || null,
      }).catch(error => {
        // Handle profile update errors gracefully
        if (error.response?.status === 404) {
          console.warn('[Onboarding] Profile update endpoint not found');
          return { success: false, error: { code: 'ENDPOINT_NOT_FOUND' } };
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.warn('[Onboarding] Authentication error during profile update');
          return { success: false, error: { code: 'UNAUTHORIZED' } };
        }
        throw error;
      });

      if (!result.success && result.error?.code === 'ENDPOINT_NOT_FOUND') {
        console.warn('[Onboarding] Profile update not available, continuing without saving');
        addSystem('Profile could not be saved, but you can continue onboarding.');
      } else if (!result.success && result.error?.code === 'UNAUTHORIZED') {
        console.warn('[Onboarding] Authentication issue, but continuing onboarding');
        addSystem('Authentication issue detected. Please log in again after onboarding.');
      }
    } catch (error: any) {
      console.error('[Onboarding] Profile save error:', error);
      // Don't block the onboarding flow for profile save failures
      addSystem('Profile could not be saved, but you can continue setting up your voice.');
    }

    setProfileSaving(false);
    addEcho(`Got it, ${displayName.trim().split(' ')[0]}. Now let's teach me your voice.`);

    // Start the guided import flow
    setTimeout(() => advanceToStep('youtube'), 500);
  };

  const handleImportUrl = async (platform: Step) => {
    if (!importUrl.trim() || importing) return;

    let normalizedUrl = importUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;

    addUser(normalizedUrl);
    setImporting(true);

    try {
      const apiPlatform = platform === 'blog' ? 'blog' : platform as 'youtube' | 'instagram';
      const result = await api.kbContent.startSocialImport({
        platform: apiPlatform,
        url: normalizedUrl,
        knowledgeBaseId: defaultKbId,
        useForVoiceMatching: true,
      }).catch(error => {
        // Enhanced error handling for import operations
        if (error.response?.status === 404) {
          const errorMsg = error.response?.data?.message || 'Import service not available';
          return { success: false, error: { code: 'IMPORT_NOT_FOUND', message: errorMsg } };
        }
        if (error.response?.status === 400) {
          const errorMsg = error.response?.data?.message || 'Invalid URL or unsupported content';
          return { success: false, error: { code: 'INVALID_URL', message: errorMsg } };
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          return { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } };
        }
        throw error;
      });

      if (result.success) {
        setCompletedItems(prev => prev + 1);
        const label = platform.charAt(0).toUpperCase() + platform.slice(1);
        addSystem(`${label} import started. Processing in background.`);
        await refresh();
      } else if (result.error?.code === 'IMPORT_NOT_FOUND') {
        addSystem('Import service is temporarily unavailable. You can try again later or skip this step.');
      } else if (result.error?.code === 'INVALID_URL') {
        addSystem(result.error.message || 'Invalid URL. Please check the URL format and try again.');
      } else if (result.error?.code === 'UNAUTHORIZED') {
        addSystem('Authentication required. Please make sure you are logged in.');
      } else {
        throw new Error(result.error?.message || 'Import failed');
      }
    } catch (err: any) {
      console.error(`[Onboarding] ${platform} import error:`, err);
      
      let errorMessage = extractErrorMessage(err, 'Import failed. Check the URL and try again.');
      
      // Provide more helpful error messages
      if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error during import. Please check your connection and try again.';
      } else if (err.response?.status === 429) {
        errorMessage = 'Too many import requests. Please wait a moment and try again.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error during import. Please try again in a few minutes.';
      }
      
      addSystem(errorMessage);
    }

    setImporting(false);
    setImportUrl('');

    // Move to next step
    setTimeout(() => advanceToStep(getNextImportStep(platform)), 800);
  };

  const handleSkipStep = (currentStep: Step) => {
    addUser('Skip');
    setSkippedSteps(prev => new Set([...prev, currentStep]));
    advanceToStep(getNextImportStep(currentStep));
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim() || pasteText.length < 50 || pasting) return;

    addUser(`Pasted ${pasteText.split(/\s+/).length} words`);
    setPasting(true);

    try {
      const result = await api.kbContent.paste({
        text: pasteText,
        title: 'Writing sample',
        sourceType: 'writing_sample',
        knowledgeBaseId: defaultKbId,
      }).catch(error => {
        // Handle paste API errors
        if (error.response?.status === 404) {
          return { success: false, error: { code: 'PASTE_NOT_FOUND', message: 'Paste service not available' } };
        }
        if (error.response?.status === 413) {
          return { success: false, error: { code: 'TEXT_TOO_LARGE', message: 'Text is too large' } };
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          return { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } };
        }
        throw error;
      });

      if (result.success) {
        setCompletedItems(prev => prev + 1);
        addSystem('Writing sample added.');
        await refresh();
      } else if (result.error?.code === 'PASTE_NOT_FOUND') {
        addSystem('Paste service is temporarily unavailable. You can try again later.');
      } else if (result.error?.code === 'TEXT_TOO_LARGE') {
        addSystem('The text is too large. Please try with a shorter sample.');
      } else if (result.error?.code === 'UNAUTHORIZED') {
        addSystem('Authentication required. Please make sure you are logged in.');
      } else {
        throw new Error(result.error?.message || 'Failed to save text');
      }
    } catch (error: any) {
      console.error('[Onboarding] Paste submit error:', error);
      
      let errorMessage = 'Failed to save. Try again.';
      if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again in a moment.';
      }
      
      addSystem(errorMessage);
    }

    setPasting(false);
    setPasteText('');
    setTimeout(() => advanceToStep(getNextImportStep('paste')), 800);
  };

  const handleVoiceSaved = async () => {
    setShowVoiceModal(false);
    setCompletedItems(prev => prev + 1);
    addUser('Voice recording');
    addSystem('Voice recording transcribed and added.');
    await refresh();
    setTimeout(() => advanceToStep(getNextImportStep('voice')), 800);
  };

  const handleFilesAdded = async (files: File[]) => {
    if (!defaultKbId) return;
    setShowUploadModal(false);

    const mboxFiles = files.filter(isMboxFile);
    const otherFiles = files.filter(f => !isMboxFile(f));

    for (const file of mboxFiles) {
      await processMboxFile(file);
    }

    for (const file of otherFiles) {
      addUser(file.name);
      try {
        await api.files.upload(defaultKbId, file);
        setCompletedItems(prev => prev + 1);
        addSystem(`${file.name} uploaded.`);
      } catch {
        addSystem(`Failed to upload ${file.name}.`);
      }
    }

    await refresh();
    setTimeout(() => advanceToStep('check'), 800);
  };

  const processMboxFile = async (file: File) => {
    setMboxUploading(true);
    setMboxProgress(0);
    setMboxStatus('Reading file...');
    addUser(file.name);

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
        addSystem('No emails found. Make sure you use your "Sent" folder.');
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

      setCompletedItems(prev => prev + 1);
      addSystem(`${result.emailsIngested} emails imported.`);
    } catch (err) {
      addSystem(`Email import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setMboxUploading(false);
      setMboxStatus('');
    }
  };

  const handleMboxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowMboxModal(false);
    await processMboxFile(file);
    if (mboxInputRef.current) mboxInputRef.current.value = '';
    await refresh();
    setTimeout(() => advanceToStep('check'), 800);
  };

  const handleAddMore = () => {
    // Show remaining options user hasn't tried
    const remaining = IMPORT_STEPS.filter(s => !skippedSteps.has(s));
    if (remaining.length > 0) {
      advanceToStep(remaining[0]);
    } else {
      // All steps tried, offer upload/email as extras
      addEcho("You can also upload files or import an email archive.");
      setStep('check');
    }
  };

  // ─── Error State ───
  if (error && error.includes('service is not available')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
            <X className="w-8 h-8 text-error" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Service Temporarily Unavailable</h2>
          <p className="text-text-secondary mb-6">
            The onboarding service is temporarily unavailable. Please try again in a few minutes.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/app')}
              className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-bg-secondary transition-colors"
            >
              Skip to App
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading ───
  if (kbLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-text-secondary">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // ─── RENDER ───
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hidden mbox input */}
      <input
        ref={mboxInputRef}
        type="file"
        accept=".mbox,application/mbox,application/octet-stream,text/plain"
        onChange={handleMboxUpload}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <span className="text-lg font-bold text-accent">EchoMe</span>
        <div className="flex items-center gap-4">
          {/* Progress indicator */}
          <span className="text-xs text-text-secondary tabular-nums">
            {totalCompleted}/{MIN_CONTENT_ITEMS} sources
          </span>
          <div className="w-20 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isReady ? 'bg-emerald-500' : 'bg-accent'}`}
              style={{ width: `${Math.min((totalCompleted / MIN_CONTENT_ITEMS) * 100, 100)}%` }}
            />
          </div>
          <button
            onClick={() => router.push(getPostOnboardingPath())}
            className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Skip
          </button>
        </div>
      </div>

      {/* MBOX progress banner */}
      {mboxUploading && (
        <div className="px-6 pb-2">
          <MboxProgressUI progress={mboxProgress} status={mboxStatus} />
        </div>
      )}

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map(m => (
            <div key={m.id}>
              {m.role === 'echo' ? (
                <div className="flex gap-3 items-start">
                  <EchoAvatar />
                  <div className="max-w-[85%] bg-white/[0.03] backdrop-blur-xl text-text-primary px-5 py-3.5 rounded-2xl rounded-tl-none border border-white/[0.06] text-sm leading-relaxed">
                    {m.content}
                  </div>
                </div>
              ) : m.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-accent text-white px-5 py-3.5 rounded-2xl rounded-tr-none text-sm font-medium">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 pl-[52px]">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-xs text-emerald-400">{m.content}</span>
                </div>
              )}
            </div>
          ))}

          {/* ─── Step-specific inline UI ─── */}

          {/* Welcome: Get started button */}
          {step === 'welcome' && (
            <div className="pl-[52px]">
              <button
                onClick={handleGetStarted}
                className="px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-all flex items-center gap-2"
              >
                Let's get started <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Profile: Name + optional handles */}
          {step === 'profile' && (
            <div className="pl-[52px] space-y-3">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full max-w-sm px-4 py-3 text-sm border border-border rounded-xl bg-bg-primary focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && displayName.trim()) handleSaveProfile(); }}
              />
              <div className="flex gap-2 max-w-sm">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">@</span>
                  <input
                    type="text"
                    value={twitterHandle}
                    onChange={e => setTwitterHandle(e.target.value)}
                    placeholder="X handle (optional)"
                    className="w-full pl-7 pr-3 py-2.5 text-sm border border-border rounded-xl bg-bg-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                </div>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">@</span>
                  <input
                    type="text"
                    value={instagramHandle}
                    onChange={e => setInstagramHandle(e.target.value)}
                    placeholder="instagram (optional)"
                    className="w-full pl-7 pr-3 py-2.5 text-sm border border-border rounded-xl bg-bg-primary focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={!displayName.trim() || profileSaving}
                className="px-5 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent/90 transition-all disabled:opacity-40 flex items-center gap-2"
              >
                {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Continue
              </button>
            </div>
          )}

          {/* YouTube / Instagram / Blog: URL input + skip */}
          {(step === 'youtube' || step === 'instagram' || step === 'blog') && (
            <div className="pl-[52px] space-y-3">
              <div className="flex gap-2 max-w-lg">
                <input
                  type="text"
                  value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  placeholder={
                    step === 'youtube' ? 'https://youtube.com/@channel or video link'
                    : step === 'instagram' ? 'https://instagram.com/username'
                    : 'https://yourblog.com or RSS feed'
                  }
                  className="flex-1 px-4 py-3 text-sm border border-border rounded-xl bg-bg-primary focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && importUrl.trim()) handleImportUrl(step); }}
                  disabled={importing}
                />
                <button
                  onClick={() => handleImportUrl(step)}
                  disabled={!importUrl.trim() || importing}
                  className="px-5 py-3 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent/90 disabled:opacity-40 flex items-center gap-2"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                </button>
              </div>
              <button
                onClick={() => handleSkipStep(step)}
                disabled={importing}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Skip this
              </button>
            </div>
          )}

          {/* Paste: textarea + skip */}
          {step === 'paste' && (
            <div className="pl-[52px] space-y-3">
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="Paste something you've written. An email, a post, a blog draft. Anything works."
                rows={4}
                className="w-full max-w-lg px-4 py-3 text-sm border border-border rounded-xl bg-bg-primary focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all resize-none"
                autoFocus
                disabled={pasting}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePasteSubmit}
                  disabled={!pasteText.trim() || pasteText.length < 50 || pasting}
                  className="px-5 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent/90 disabled:opacity-40 flex items-center gap-2"
                >
                  {pasting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                </button>
                <span className="text-xs text-text-tertiary">
                  {pasteText.length < 50 ? `${50 - pasteText.length} more chars needed` : `${pasteText.split(/\s+/).length} words`}
                </span>
              </div>
              <button
                onClick={() => handleSkipStep('paste')}
                disabled={pasting}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Skip this
              </button>
            </div>
          )}

          {/* Voice: open recorder + skip */}
          {step === 'voice' && (
            <div className="pl-[52px] space-y-3">
              <button
                onClick={() => setShowVoiceModal(true)}
                className="px-5 py-3 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent/90 flex items-center gap-2"
              >
                <Mic className="w-4 h-4" /> Start Recording
              </button>
              <button
                onClick={() => handleSkipStep('voice')}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Skip this
              </button>
            </div>
          )}

          {/* Check: need more or ready */}
          {step === 'check' && !isReady && (
            <div className="pl-[52px] space-y-3">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => advanceToStep('youtube')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary hover:border-accent/40 text-sm font-medium">
                  <Play className="w-4 h-4 text-accent" /> YouTube
                </button>
                <button onClick={() => advanceToStep('instagram')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary hover:border-accent/40 text-sm font-medium">
                  <Camera className="w-4 h-4 text-accent" /> Instagram
                </button>
                <button onClick={() => advanceToStep('blog')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary hover:border-accent/40 text-sm font-medium">
                  <FileText className="w-4 h-4 text-accent" /> Blog
                </button>
                <button onClick={() => advanceToStep('paste')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary hover:border-accent/40 text-sm font-medium">
                  <PenLine className="w-4 h-4 text-accent" /> Paste Text
                </button>
                <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary hover:border-accent/40 text-sm font-medium">
                  <Upload className="w-4 h-4 text-accent" /> Upload Files
                </button>
                <button onClick={() => advanceToStep('voice')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary hover:border-accent/40 text-sm font-medium">
                  <Mic className="w-4 h-4 text-accent" /> Voice Note
                </button>
                <button onClick={() => { setShowMboxModal(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary hover:border-accent/40 text-sm font-medium">
                  <Mail className="w-4 h-4 text-accent" /> Import Emails
                </button>
              </div>
            </div>
          )}

          {/* Done: Start creating button */}
          {step === 'done' && (
            <div className="pl-[52px]">
              <button
                onClick={() => router.push(getPostOnboardingPath())}
                className="px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-all flex items-center gap-2"
              >
                Start Creating <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ─── */}

      {/* Voice recorder */}
      {showVoiceModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowVoiceModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-bg-primary border border-border rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-semibold">Record Voice</h2>
                <button onClick={() => setShowVoiceModal(false)} className="text-text-secondary hover:text-text-primary" aria-label="Close"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4">
                <VoiceRecorder onSaved={handleVoiceSaved} knowledgeBaseId={defaultKbId ?? undefined} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* File upload */}
      {showUploadModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowUploadModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-bg-primary border border-border rounded-xl shadow-xl max-w-xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Upload Files</h2>
                <button onClick={() => setShowUploadModal(false)} className="text-text-secondary hover:text-text-primary" aria-label="Close"><X className="w-5 h-5" /></button>
              </div>
              <UploadZone onFilesAdded={handleFilesAdded} />
            </div>
          </div>
        </>
      )}

      {/* MBOX instructions */}
      {showMboxModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowMboxModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-bg-primary border border-border rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Import Emails</h2>
                <button onClick={() => setShowMboxModal(false)} className="text-text-secondary hover:text-text-primary" aria-label="Close"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-text-secondary mb-4">Import your sent emails to teach Echo your writing style.</p>
              <div className="space-y-3 mb-4">
                <div className="p-3 bg-bg-secondary rounded-lg text-xs">
                  <p className="font-medium mb-1">Gmail</p>
                  <p className="text-text-secondary">Go to takeout.google.com, export Mail, select Sent folder</p>
                </div>
                <div className="p-3 bg-bg-secondary rounded-lg text-xs">
                  <p className="font-medium mb-1">Apple Mail</p>
                  <p className="text-text-secondary">Mailbox, Export Mailbox, upload the .mbox file</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowMboxModal(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
                <button onClick={() => { setShowMboxModal(false); mboxInputRef.current?.click(); }} className="flex-1 btn-primary py-2 text-sm">Select File</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
