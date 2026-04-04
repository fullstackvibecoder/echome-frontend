'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, Send, Play, Camera, FileText, Upload, Mic, Mail, PenLine, CheckCircle, Clock, AlertCircle, Loader2, Link, ArrowRight, Share2, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import { showErrorToast } from '@/lib/toast';
import { UnifiedContentItem, ContentSourceType, CONTENT_SOURCE_CONFIG } from '@/types';

// ============================================
// HELPERS
// ============================================

const SOURCE_LABELS: Record<string, string> = {
  file_upload: 'File upload', paste_text: 'Writing sample', paste_social: 'Social post',
  paste_email: 'Email', voice_recording: 'Voice recording', mbox_import: 'Email archive',
  youtube_import: 'YouTube', instagram_import: 'Instagram', blog_import: 'Blog',
  generation: 'Generated', 'clip-finder': 'Video clip',
};

function formatTimeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const VOICE_PROMPTS = [
  { label: 'How close is the match?', prompt: 'How well do you know my voice right now? What would make the match stronger?' },
  { label: 'Describe my style', prompt: 'Summarize my writing voice in 3 sentences based on what you\'ve learned so far' },
  { label: 'What am I missing?', prompt: 'What types of content am I missing that would help you sound more like me?' },
];

// ============================================
// INLINE URL IMPORT
// ============================================

function UrlImportForm({
  platform,
  onImport,
  onCancel,
}: {
  platform: string;
  onImport: (url: string, isOwnContent: boolean) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState('');
  const [isOwnContent, setIsOwnContent] = useState(true);
  const [googleConnected, setGoogleConnected] = useState<{ connected: boolean; username?: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const placeholders: Record<string, string> = {
    youtube: 'https://youtube.com/@channel or video link',
    instagram: 'https://instagram.com/username or post link',
    blog: 'https://yourblog.com or RSS feed URL',
  };

  // Check Google connection status for YouTube
  useEffect(() => {
    if (platform !== 'youtube') return;
    (async () => {
      try {
        const res = await api.social.getStatus();
        if (res.success && res.data) {
          const integrations = Array.isArray(res.data) ? res.data : [];
          const google = integrations.find((i) => i.platform === 'google');
          setGoogleConnected(google ? { connected: google.status === 'connected' || google.status === 'active', username: google.accountName || google.platform_username } : { connected: false });
        }
      } catch {
        setGoogleConnected({ connected: false });
      }
    })();
  }, [platform]);

  // Focus URL input (but not if YouTube connect is prominent)
  useEffect(() => {
    if (platform !== 'youtube') inputRef.current?.focus();
  }, [platform]);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const result = await api.social.connect('google');
      if (result.success && result.data?.authUrl) {
        window.location.href = result.data.authUrl;
      }
    } catch (err) {
      showErrorToast(err, 'connecting YouTube');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await api.social.syncGoogle({});
    } catch (err) {
      showErrorToast(err, 'syncing YouTube');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.social.disconnect('google');
      setGoogleConnected({ connected: false });
    } catch (err) {
      showErrorToast(err, 'disconnecting YouTube');
    }
  };

  return (
    <div className="bg-bg-secondary rounded-xl p-4 border border-border space-y-3">
      {/* YouTube: Connect Channel button */}
      {platform === 'youtube' && googleConnected && (
        <div className="mb-1">
          {googleConnected.connected ? (
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <div>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">YouTube connected</span>
                  {googleConnected.username && <span className="text-xs text-text-secondary ml-1">({googleConnected.username})</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleSync} disabled={syncing} className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50">
                  {syncing ? 'Syncing...' : 'Sync'}
                </button>
                <button onClick={handleDisconnect} className="text-xs text-text-tertiary hover:text-error transition-colors">
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-bg-primary border-2 border-border rounded-xl hover:border-accent/50 transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-sm font-medium text-text-primary">
                {connecting ? 'Connecting...' : 'Connect YouTube Channel'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* URL paste input */}
      <div className="flex items-center gap-2">
        <Link className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium text-text-primary">
          {platform === 'youtube' ? 'Or paste a link manually' : `Paste your ${platform === 'instagram' ? 'Instagram' : 'blog'} link`}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && url.trim()) onImport(url.trim(), isOwnContent); }}
          placeholder={placeholders[platform] || 'Paste URL...'}
          className="flex-1 px-4 py-3 text-sm border border-border rounded-xl bg-bg-primary focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
        />
        <button
          onClick={() => url.trim() && onImport(url.trim(), isOwnContent)}
          disabled={!url.trim()}
          className="px-5 py-3 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-all disabled:opacity-40"
        >
          Import
        </button>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={isOwnContent}
            onChange={e => setIsOwnContent(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent"
          />
          This is my own content
        </label>
        <button onClick={onCancel} className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface AskYourVoiceProps {
  kbId?: string | null;
  contentSummary?: string;
  hasContent: boolean;
  contentItems: UnifiedContentItem[];
  onOpenModal: (modal: 'paste' | 'upload' | 'voice' | 'email') => void;
  onImportComplete: () => void;
  knowledgeBaseId?: string;
}

export function AskYourVoice({
  kbId,
  contentSummary,
  hasContent,
  contentItems,
  onOpenModal,
  onImportComplete,
  knowledgeBaseId,
}: AskYourVoiceProps) {
  const [showUrlForm, setShowUrlForm] = useState<string | null>(null);
  const [showSubChoices, setShowSubChoices] = useState<'socials' | 'writing' | null>(null);
  const [backgroundImports, setBackgroundImports] = useState<Array<{ platform: string; status: string; count?: number }>>([]);

  // Echo helper state
  const [echoOpen, setEchoOpen] = useState(false);
  const [echoInput, setEchoInput] = useState('');
  const [echoLoading, setEchoLoading] = useState(false);
  const [echoMessages, setEchoMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const echoScrollRef = useRef<HTMLDivElement>(null);
  const pollRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    return () => { pollRefs.current.forEach(t => clearInterval(t)); };
  }, []);

  useEffect(() => {
    if (echoScrollRef.current) echoScrollRef.current.scrollTop = echoScrollRef.current.scrollHeight;
  }, [echoMessages, echoLoading]);

  // ─── Action card handlers ───
  const handleConnectSocials = () => {
    setShowSubChoices(showSubChoices === 'socials' ? null : 'socials');
    setShowUrlForm(null);
  };

  const handleImportWriting = () => {
    setShowSubChoices(showSubChoices === 'writing' ? null : 'writing');
    setShowUrlForm(null);
  };

  const handleRecordVoice = () => {
    setShowSubChoices(null);
    setShowUrlForm(null);
    onOpenModal('voice');
  };

  const handleSubChoice = (id: string, modal?: string) => {
    setShowSubChoices(null);
    if (modal) {
      onOpenModal(modal as 'paste' | 'upload' | 'voice' | 'email');
    } else {
      setShowUrlForm(id);
    }
  };

  // ─── URL import (background) ───
  const handleUrlImport = async (platform: string, url: string, isOwnContent: boolean) => {
    setShowUrlForm(null);
    let normalizedUrl = url;
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;

    const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
    const importIdx = backgroundImports.length;
    setBackgroundImports(prev => [...prev, { platform: platformLabel, status: 'Importing...' }]);

    try {
      const result = await api.kbContent.startSocialImport({
        platform: platform === 'blog' ? 'blog' : platform as 'youtube' | 'instagram',
        url: normalizedUrl,
        knowledgeBaseId,
        useForVoiceMatching: isOwnContent,
      });

      if (!result.success || !result.jobId) throw new Error('Failed to start import');

      let pollCount = 0;
      let consecutiveErrors = 0;
      const pollId = setInterval(async () => {
        try {
          const status = await api.kbContent.getSocialImportStatus(result.jobId!);
          consecutiveErrors = 0;
          if (status.job) {
            setBackgroundImports(prev => prev.map((imp, i) =>
              i === importIdx ? { ...imp, status: 'Importing...', count: status.job?.contentCount } : imp
            ));
            if (status.job.status === 'completed') {
              clearInterval(pollId);
              setBackgroundImports(prev => prev.map((imp, i) =>
                i === importIdx ? { ...imp, status: 'Done', count: status.job!.contentCount } : imp
              ));
              setTimeout(() => {
                setBackgroundImports(prev => prev.filter((_, i) => i !== importIdx));
              }, 5000);
              onImportComplete();
            } else if (status.job.status === 'failed') {
              clearInterval(pollId);
              setBackgroundImports(prev => prev.map((imp, i) =>
                i === importIdx ? { ...imp, status: 'Failed' } : imp
              ));
            }
          }
          pollCount++;
          if (pollCount > 60) {
            clearInterval(pollId);
            setBackgroundImports(prev => prev.filter((_, i) => i !== importIdx));
            onImportComplete();
          }
        } catch {
          consecutiveErrors++;
          if (consecutiveErrors >= 5) {
            clearInterval(pollId);
            setBackgroundImports(prev => prev.filter((_, i) => i !== importIdx));
          }
        }
      }, 5000);
      pollRefs.current.push(pollId);
    } catch (err) {
      setBackgroundImports(prev => prev.map((imp, i) =>
        i === importIdx ? { ...imp, status: extractErrorMessage(err, 'Import failed') } : imp
      ));
    }
  };

  // ─── Echo helper chat ───
  const sendEchoMessage = useCallback(async (query?: string) => {
    const text = (query || echoInput).trim();
    if (!text || echoLoading) return;

    setEchoInput('');
    setEchoOpen(true);
    setEchoMessages(prev => [...prev, { role: 'user', content: text }]);
    setEchoLoading(true);

    const history = echoMessages.slice(-6);

    try {
      const rawResponse = kbId ? await api.kb.chat(kbId, text, history) : await api.help.chat(text, history);
      let fullContent = '';
      for (const line of rawResponse.split('\n')) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.type === 'done') break;
            if (parsed.type === 'error') { fullContent = parsed.message || 'Something went wrong.'; break; }
            if (parsed.content) fullContent += parsed.content;
            if (parsed.text) fullContent += parsed.text;
          } catch { if (payload && payload !== '[DONE]') fullContent += payload; }
        }
      }
      if (!fullContent) fullContent = 'Sorry, I could not generate a response. Please try again.';
      setEchoMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
    } catch {
      setEchoMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally { setEchoLoading(false); }
  }, [echoInput, echoLoading, echoMessages, kbId]);

  // ─── Recent activity (from contentItems) ───
  const recentItems = contentItems
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  // ─── RENDER ───
  return (
    <div className="px-4 sm:px-6 py-6 space-y-6 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ─── Background import banners ─── */}
        {backgroundImports.map((imp, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-accent/10 border border-accent/20 rounded-xl">
            {imp.status === 'Done' ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : imp.status === 'Failed' ? (
              <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
            )}
            <span className="text-xs text-text-secondary">
              {imp.platform}: {imp.status}{imp.count ? ` (${imp.count} found)` : ''}
            </span>
          </div>
        ))}

        {/* ─── 3 Action Cards (always visible) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleConnectSocials}
            className="group relative flex flex-col items-start p-6 rounded-[1.5rem] bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-accent/40 transition-all duration-300 text-left hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.5rem]" />
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent transition-colors duration-300">
              <Share2 className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">Connect my Socials</h3>
            <p className="text-xs text-text-secondary leading-snug mb-1">Your social posts are your voice at its most unfiltered.</p>
            <p className="text-[11px] text-text-tertiary mb-4">Import from YouTube or Instagram.</p>
            <div className="mt-auto flex items-center text-accent text-xs font-semibold gap-1">
              Get Started <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          <button
            onClick={handleImportWriting}
            className="group relative flex flex-col items-start p-6 rounded-[1.5rem] bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-accent-purple/40 transition-all duration-300 text-left hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.5rem]" />
            <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center mb-4 group-hover:bg-accent-purple transition-colors duration-300">
              <FileText className="w-6 h-6 text-accent-purple group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">Import my Writing</h3>
            <p className="text-xs text-text-secondary leading-snug mb-1">Long-form content shows how you structure ideas and explain what you know.</p>
            <p className="text-[11px] text-text-tertiary mb-4">Upload PDFs, articles, blog posts, or emails.</p>
            <div className="mt-auto flex items-center text-accent-purple text-xs font-semibold gap-1">
              Upload Files <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          <button
            onClick={handleRecordVoice}
            className="group relative flex flex-col items-start p-6 rounded-[1.5rem] bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-accent/40 transition-all duration-300 text-left hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.5rem]" />
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent transition-colors duration-300">
              <Mic className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">Record a Voice Note</h3>
            <p className="text-xs text-text-secondary leading-snug mb-1">Nothing captures tone like your actual voice. Cadence, rhythm, word choice.</p>
            <p className="text-[11px] text-text-tertiary mb-4">Just talk. I'll pick it up.</p>
            <div className="mt-auto flex items-center text-accent text-xs font-semibold gap-1">
              Start Talking <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>

        {/* ─── Sub-choices (expand below cards) ─── */}
        {showSubChoices === 'socials' && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleSubChoice('youtube')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary hover:border-accent/40 hover:bg-accent/5 transition-all text-sm font-medium">
              <Play className="w-4 h-4 text-accent" /> YouTube
            </button>
            <button onClick={() => handleSubChoice('instagram')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary hover:border-accent/40 hover:bg-accent/5 transition-all text-sm font-medium">
              <Camera className="w-4 h-4 text-accent" /> Instagram
            </button>
          </div>
        )}

        {showSubChoices === 'writing' && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleSubChoice('paste', 'paste')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary hover:border-accent-purple/40 hover:bg-accent-purple/5 transition-all text-sm font-medium">
              <PenLine className="w-4 h-4 text-accent-purple" /> Paste Text
            </button>
            <button onClick={() => handleSubChoice('upload', 'upload')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary hover:border-accent-purple/40 hover:bg-accent-purple/5 transition-all text-sm font-medium">
              <Upload className="w-4 h-4 text-accent-purple" /> Upload Files
            </button>
            <button onClick={() => handleSubChoice('blog')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary hover:border-accent-purple/40 hover:bg-accent-purple/5 transition-all text-sm font-medium">
              <FileText className="w-4 h-4 text-accent-purple" /> Import Blog
            </button>
            <button onClick={() => handleSubChoice('email', 'email')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary hover:border-accent-purple/40 hover:bg-accent-purple/5 transition-all text-sm font-medium">
              <Mail className="w-4 h-4 text-accent-purple" /> Import Emails
            </button>
          </div>
        )}

        {/* ─── Inline URL form ─── */}
        {showUrlForm && (
          <UrlImportForm
            platform={showUrlForm}
            onImport={(url, isOwn) => handleUrlImport(showUrlForm, url, isOwn)}
            onCancel={() => setShowUrlForm(null)}
          />
        )}

        {/* ─── Recent Activity ─── */}
        {recentItems.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Recent Activity</h3>
            <div className="space-y-1">
              {recentItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm">
                  {item.status === 'completed' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  ) : item.status === 'processing' || item.status === 'uploading' ? (
                    <Loader2 className="w-3.5 h-3.5 text-accent animate-spin flex-shrink-0" />
                  ) : item.status === 'failed' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-error flex-shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                  )}
                  <span className="text-text-primary truncate flex-1">{item.title}</span>
                  <span className="text-xs text-text-tertiary whitespace-nowrap">
                    {SOURCE_LABELS[item.sourceType] || item.sourceType}
                  </span>
                  {item.chunkCount > 0 && (
                    <span className="text-xs text-text-tertiary whitespace-nowrap">{item.chunkCount} patterns</span>
                  )}
                  <span className="text-xs text-text-tertiary whitespace-nowrap">{formatTimeAgo(item.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Empty state ─── */}
        {!hasContent && recentItems.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-text-secondary">
              No content yet. Pick an option above to start building your voice.
            </p>
          </div>
        )}

        {/* ─── Ask Echo (collapsible helper) ─── */}
        {hasContent && (
          <div className="border border-border rounded-xl overflow-hidden">
            {/* Header / collapsed state */}
            <button
              onClick={() => setEchoOpen(!echoOpen)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-text-primary flex-1">See what Echo learned about you</span>
              <ArrowRight className={`w-4 h-4 text-text-tertiary transition-transform ${echoOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* Expanded state */}
            {echoOpen && (
              <div className="border-t border-border">
                {/* Suggestion chips */}
                {echoMessages.length === 0 && (
                  <div className="flex flex-wrap gap-2 px-4 py-3">
                    {VOICE_PROMPTS.map(({ label, prompt }) => (
                      <button
                        key={label}
                        onClick={() => sendEchoMessage(prompt)}
                        disabled={echoLoading}
                        className="px-3 py-1.5 text-xs font-medium border border-border rounded-full text-text-secondary hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all disabled:opacity-50"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Messages */}
                {echoMessages.length > 0 && (
                  <div ref={echoScrollRef} className="max-h-[300px] overflow-y-auto px-4 py-3 space-y-3">
                    {echoMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-accent text-white rounded-br-md'
                            : 'bg-bg-secondary text-text-primary rounded-bl-md'
                        }`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {echoLoading && (
                      <div className="flex justify-start">
                        <div className="bg-bg-secondary px-4 py-2.5 rounded-2xl rounded-bl-md">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Input */}
                <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
                  <input
                    type="text"
                    value={echoInput}
                    onChange={e => setEchoInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') sendEchoMessage(); }}
                    placeholder="Ask Echo anything about your content style..."
                    disabled={echoLoading}
                    className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-bg-primary focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={() => sendEchoMessage()}
                    disabled={echoLoading || !echoInput.trim()}
                    className="w-9 h-9 rounded-lg bg-accent text-white flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  {echoMessages.length > 0 && (
                    <button
                      onClick={() => { setEchoMessages([]); setEchoInput(''); }}
                      className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
